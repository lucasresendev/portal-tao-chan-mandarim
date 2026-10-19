'use server';

import '@/lib/demo/supabaseSandbox';
import type { DemoServerPayload } from '@/lib/demo/supabaseSandbox';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase com a chave Service Role para acesso administrativo total
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function createStudentAction(formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const senha = formData.get('senha') as string;
    const nome = formData.get('nome') as string;
    const statusMatricula = formData.get('statusMatricula') as string;

    if (!email || !senha || !nome) {
      return { error: 'Por favor, preencha todos os campos obrigatórios.' };
    }

    // 1. Cria a conta no Supabase Auth usando a Service Role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: senha,
      email_confirm: true, // Auto-confirma o e-mail
    });

    if (authError) {
      return { error: authError.message };
    }

    const newUserId = authData.user?.id;
    const demoPayloads: DemoServerPayload[] = [];

    if (newUserId) {
      const alunoRow = {
        id: newUserId,
        nome: nome,
        status_matricula: statusMatricula,
        email: email,
        is_admin: false,
      };
      // 2. Atualiza o perfil do aluno na tabela 'alunos'
      const { error: updateError } = await supabaseAdmin
        .from('alunos')
        .upsert(alunoRow, { onConflict: 'id' });

      if (updateError) {
        console.error("Erro ao atualizar o aluno no BD:", updateError);
        return { error: 'Usuário criado, mas ocorreu um erro ao atualizar os dados do perfil.' };
      }

      demoPayloads.push({
        table: 'alunos',
        row: alunoRow,
        conflictKeys: ['id'],
      });
    }

    return { success: true, demoPayloads };
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: 'Ocorreu um erro desconhecido.' };
  }
}

export async function updateStudentCredentialsAction({
  userId,
  email,
  password,
}: {
  userId: string;
  email?: string;
  password?: string;
}) {
  try {
    if (!userId) return { error: 'ID do aluno não fornecido.' };
    if (!email && !password) return { error: 'Informe ao menos um campo para atualizar.' };

    const updates: { email?: string; password?: string } = {};
    if (email) updates.email = email;
    if (password) updates.password = password;

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updates
    );

    if (authError) return { error: authError.message };

    const demoPayloads: DemoServerPayload[] = [];
    // Se o email mudou, sincroniza na tabela alunos também
    if (email) {
      await supabaseAdmin.from('alunos').update({ email }).eq('id', userId);
      demoPayloads.push({
        table: 'alunos',
        row: { id: userId, email },
        conflictKeys: ['id'],
      });
    }

    return { success: true, demoPayloads };
  } catch (err: unknown) {
    if (err instanceof Error) return { error: err.message };
    return { error: 'Ocorreu um erro desconhecido.' };
  }
}

