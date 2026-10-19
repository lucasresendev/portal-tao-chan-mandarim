/* eslint-disable */
/**
 * scripts/upload-sounds.js
 *
 * Script para realizar o upload em lote de arquivos de som do Anki locais para o bucket 'dicionario' no Supabase.
 * Lê o arquivo .env.local para obter as chaves de acesso.
 */


const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Ler as variáveis de ambiente do .env.local
const envPaths = [path.join(process.cwd(), '.env.local'), path.join(process.cwd(), '.env')];
let envFile = '';
for (const p of envPaths) {
    if (fs.existsSync(p)) {
        envFile = fs.readFileSync(p, 'utf-8');
        break;
    }
}

const getEnv = (key) => {
    if (process.env[key]) return process.env[key];
    const match = envFile.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas no .env.local ou variáveis de ambiente.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
});

const localMediaDir = process.env.ANKI_MEDIA_DIR || path.join(process.cwd(), 'media');

async function run() {
    console.log('============================================================');
    console.log('🎙️  INICIANDO UPLOAD DE ÁUDIOS DO ANKI PARA O SUPABASE STORAGE');
    console.log('============================================================');
    console.log(`URL do Supabase: ${supabaseUrl}`);
    console.log(`Diretório local do Anki: ${localMediaDir}\n`);

    if (!fs.existsSync(localMediaDir)) {
        console.error(`❌ Erro: Diretório local do Anki não existe: "${localMediaDir}"`);
        process.exit(1);
    }

    // 2. Buscar registros do dicionário que contêm sons configurados
    console.log('🔍 Consultando coluna "som" da tabela "dicionario"...');
    const { data: dbItems, error: dbError } = await supabase
        .from('dicionario')
        .select('id, hanzi_simp, pinyin, som')
        .not('som', 'is', null)
        .neq('som', '');

    if (dbError) {
        console.error('❌ Erro ao consultar banco de dados:', dbError);
        process.exit(1);
    }

    console.log(`📊 Encontrados ${dbItems.length} registros com áudio configurado.`);

    // 3. Extrair os arquivos de som únicos e limpar o formato
    const soundToItemsMap = new Map();
    for (const item of dbItems) {
        // Formatos aceitos: [sound:filename.mp3] ou direto filename.mp3
        let filename = item.som.trim();
        const match = filename.match(/\[sound:(.+?)\]/);
        if (match && match[1]) {
            filename = match[1];
        }
        
        if (filename) {
            if (!soundToItemsMap.has(filename)) {
                soundToItemsMap.set(filename, []);
            }
            soundToItemsMap.get(filename).push(item);
        }
    }

    const uniqueSonsCount = soundToItemsMap.size;
    console.log(`🎯 Total de arquivos de som únicos a serem enviados: ${uniqueSonsCount}\n`);

    let uploaded = 0;
    let alreadyExists = 0;
    let missing = 0;
    let errors = 0;

    const fileList = Array.from(soundToItemsMap.keys());

    // 4. Executar uploads sequencialmente para não estourar taxa de transferência do plano gratuito
    for (let i = 0; i < fileList.length; i++) {
        const filename = fileList[i];
        const localPath = path.join(localMediaDir, filename);
        const storagePath = `sons/${filename}`;
        const progressStr = `[${i + 1}/${uniqueSonsCount}]`;

        if (!fs.existsSync(localPath)) {
            console.warn(`⚠️  ${progressStr} Arquivo local não encontrado no PC: "${filename}"`);
            missing++;
            continue;
        }

        try {
            const fileBuffer = fs.readFileSync(localPath);

            // Carrega arquivo no storage do Supabase (bypass RLS via service role)
            const { error: uploadError } = await supabase.storage
                .from('dicionario')
                .upload(storagePath, fileBuffer, {
                    contentType: 'audio/mpeg',
                    upsert: false // upsert false evita re-upload se já existir no storage
                });

            if (uploadError) {
                // Supabase retorna erro 409 se o arquivo já existir
                if (uploadError.message && (uploadError.message.includes('already exists') || uploadError.statusCode === '409')) {
                    alreadyExists++;
                } else {
                    console.error(`❌ ${progressStr} Falha no upload de "${filename}":`, uploadError.message || uploadError);
                    errors++;
                }
            } else {
                console.log(`✅ ${progressStr} Enviado com sucesso: "${filename}"`);
                uploaded++;
            }
        } catch (err) {
            console.error(`❌ ${progressStr} Erro inesperado ao processar "${filename}":`, err.message || err);
            errors++;
        }
    }

    // 5. Exibir resumo consolidado
    console.log('\n============================================================');
    console.log('🏁 RESULTADO DA MIGRAÇÃO DE ÁUDIOS');
    console.log('============================================================');
    console.log(`Total de arquivos processados: ${uniqueSonsCount}`);
    console.log(`🎙️  Enviados para o Supabase:   ${uploaded}`);
    console.log(`✨ Já existiam no Storage:     ${alreadyExists}`);
    console.log(`⚠️  Não localizados no Anki:   ${missing}`);
    console.log(`❌ Erros no processo:          ${errors}`);
    console.log('============================================================\n');
}

run();
