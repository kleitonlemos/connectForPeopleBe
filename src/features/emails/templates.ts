import type {
  AccountActivatedEmailData,
  EmailTemplate,
  PasswordResetEmailData,
  ReportPublishedEmailData,
  SurveyInviteEmailData,
  SurveyReminderEmailData,
  WelcomeEmailData,
} from './types.js';

const baseStyles = `
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #334155;
`;

const buttonStyle = `
  display: inline-block;
  background-color: #024383;
  color: #ffffff;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 600;
  margin: 20px 0;
`;

const headerStyle = `
  background-color: #024383;
  padding: 30px;
  text-align: center;
`;

const footerStyle = `
  background-color: #f8fafc;
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: #64748b;
`;

function wrapHtml(content: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; ${baseStyles}">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="${headerStyle}">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Connect For People</h1>
    </div>
    <div style="padding: 30px;">
      ${content}
    </div>
    <div style="${footerStyle}">
      <p>Este é um e-mail automático. Por favor, não responda.</p>
      <p>© ${new Date().getFullYear()} Connect For People. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
`;
}

export function welcomeTemplate(data: WelcomeEmailData): EmailTemplate {
  const html = wrapHtml(`
    <h2 style="color: #024383; margin-top: 0;">Bem-vindo(a) ao Connect For People!</h2>

    <p>Olá, <strong>${data.recipientName}</strong>!</p>

    <p>É com grande satisfação que damos as boas-vindas ao projeto de <strong>Diagnóstico Organizacional</strong> da <strong>${data.companyName}</strong>.</p>

    <p>O projeto <strong>${data.projectName}</strong> foi iniciado e você foi designado(a) como ponto focal. Através da nossa plataforma, você poderá:</p>

    <ul style="padding-left: 20px;">
      <li>Enviar documentos importantes da empresa</li>
      <li>Acompanhar o progresso das pesquisas</li>
      <li>Visualizar os relatórios quando publicados</li>
    </ul>

    <p style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
      Para começar, você precisa ativar sua conta e definir uma senha de acesso.
    </p>

    <div style="text-align: center;">
      <a href="${data.loginUrl}" style="${buttonStyle}">Ativar Minha Conta</a>
    </div>

    <p>Se tiver qualquer dúvida, entre em contato com nosso consultor responsável.</p>

    <p>Atenciosamente,<br><strong>Equipe Connect For People</strong></p>
  `);

  const text = `
Bem-vindo(a) ao Connect For People!

Olá, ${data.recipientName}!

É com grande satisfação que damos as boas-vindas ao projeto de Diagnóstico Organizacional da ${data.companyName}.

O projeto ${data.projectName} foi iniciado e você foi designado(a) como ponto focal.

Para começar, você precisa ativar sua conta e definir uma senha de acesso: ${data.loginUrl}

Atenciosamente,
Equipe Connect For People
  `.trim();

  return {
    subject: `Bem-vindo ao projeto ${data.projectName} - Ative sua conta`,
    html,
    text,
  };
}

export function surveyInviteTemplate(data: SurveyInviteEmailData): EmailTemplate {
  const deadlineText = data.deadline ? `<p><strong>Prazo:</strong> ${data.deadline}</p>` : '';

  const html = wrapHtml(`
    <h2 style="color: #024383; margin-top: 0;">Você foi convidado(a) a participar de uma pesquisa</h2>

    ${data.recipientName ? `<p>Olá, <strong>${data.recipientName}</strong>!</p>` : '<p>Olá!</p>'}

    <p>A <strong>${
      data.companyName
    }</strong> está realizando um importante processo de diagnóstico organizacional e sua participação é fundamental.</p>

    <p>Convidamos você a responder a pesquisa: <strong>${data.surveyName}</strong></p>

    ${deadlineText}

    <p>Suas respostas são <strong>confidenciais</strong> e serão utilizadas apenas para análise agregada, sem identificação individual.</p>

    <div style="text-align: center;">
      <a href="${data.surveyUrl}" style="${buttonStyle}">Responder Pesquisa</a>
    </div>

    <p style="font-size: 14px; color: #64748b;">
      A pesquisa leva aproximadamente 10 minutos para ser respondida.
    </p>

    <p>Agradecemos sua colaboração!</p>
  `);

  const text = `
Você foi convidado(a) a participar de uma pesquisa

${data.recipientName ? `Olá, ${data.recipientName}!` : 'Olá!'}

A ${
    data.companyName
  } está realizando um importante processo de diagnóstico organizacional e sua participação é fundamental.

Pesquisa: ${data.surveyName}
${data.deadline ? `Prazo: ${data.deadline}` : ''}

Acesse: ${data.surveyUrl}

Suas respostas são confidenciais e serão utilizadas apenas para análise agregada.

Agradecemos sua colaboração!
  `.trim();

  return {
    subject: `Convite: Pesquisa ${data.surveyName} - ${data.companyName}`,
    html,
    text,
  };
}

export function surveyReminderTemplate(data: SurveyReminderEmailData): EmailTemplate {
  const urgencyText =
    data.daysRemaining !== undefined && data.daysRemaining <= 2
      ? '<p style="color: #dc2626; font-weight: bold;">⚠️ Atenção: O prazo está se encerrando!</p>'
      : '';

  const html = wrapHtml(`
    <h2 style="color: #024383; margin-top: 0;">Lembrete: Pesquisa pendente</h2>

    ${data.recipientName ? `<p>Olá, <strong>${data.recipientName}</strong>!</p>` : '<p>Olá!</p>'}

    ${urgencyText}

    <p>Notamos que você ainda não respondeu à pesquisa <strong>${
      data.surveyName
    }</strong> da <strong>${data.companyName}</strong>.</p>

    ${data.deadline ? `<p><strong>Prazo final:</strong> ${data.deadline}</p>` : ''}
    ${
      data.daysRemaining !== undefined
        ? `<p><strong>Dias restantes:</strong> ${data.daysRemaining}</p>`
        : ''
    }

    <p>Sua participação é muito importante para o sucesso do diagnóstico organizacional!</p>

    <div style="text-align: center;">
      <a href="${data.surveyUrl}" style="${buttonStyle}">Responder Agora</a>
    </div>

    <p style="font-size: 14px; color: #64748b;">
      Se você já respondeu, por favor desconsidere este e-mail.
    </p>
  `);

  const text = `
Lembrete: Pesquisa pendente

${data.recipientName ? `Olá, ${data.recipientName}!` : 'Olá!'}

Notamos que você ainda não respondeu à pesquisa ${data.surveyName} da ${data.companyName}.

${data.deadline ? `Prazo final: ${data.deadline}` : ''}
${data.daysRemaining !== undefined ? `Dias restantes: ${data.daysRemaining}` : ''}

Acesse: ${data.surveyUrl}

Sua participação é muito importante!

Se você já respondeu, por favor desconsidere este e-mail.
  `.trim();

  return {
    subject: `Lembrete: Pesquisa ${data.surveyName} aguarda sua resposta`,
    html,
    text,
  };
}

export function reportPublishedTemplate(data: ReportPublishedEmailData): EmailTemplate {
  const html = wrapHtml(`
    <h2 style="color: #024383; margin-top: 0;">Relatório Publicado!</h2>

    <p>Olá, <strong>${data.recipientName}</strong>!</p>

    <p>É com satisfação que informamos que o relatório de diagnóstico organizacional da <strong>${data.companyName}</strong> foi finalizado e está disponível para visualização.</p>

    <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #024383;">${data.reportTitle}</h3>
      <p>O relatório contém análises detalhadas e recomendações estratégicas para sua organização.</p>
    </div>

    <div style="text-align: center;">
      <a href="${data.reportUrl}" style="${buttonStyle}">Visualizar Relatório</a>
    </div>

    <p>Caso tenha dúvidas sobre os resultados, entre em contato com nosso consultor responsável para agendar uma reunião de apresentação.</p>

    <p>Atenciosamente,<br><strong>Equipe Connect For People</strong></p>
  `);

  const text = `
Relatório Publicado!

Olá, ${data.recipientName}!

O relatório de diagnóstico organizacional da ${data.companyName} foi finalizado e está disponível.

Relatório: ${data.reportTitle}

Acesse: ${data.reportUrl}

Caso tenha dúvidas, entre em contato com nosso consultor responsável.

Atenciosamente,
Equipe Connect For People
  `.trim();

  return {
    subject: `Relatório Disponível: ${data.reportTitle}`,
    html,
    text,
  };
}

export function passwordResetTemplate(data: PasswordResetEmailData): EmailTemplate {
  const html = wrapHtml(`
    <h2 style="color: #024383; margin-top: 0;">Redefinição de Senha</h2>

    <p>Olá, <strong>${data.recipientName}</strong>!</p>

    <p>Recebemos uma solicitação para redefinir a senha da sua conta na plataforma Connect For People.</p>

    <div style="text-align: center;">
      <a href="${data.resetUrl}" style="${buttonStyle}">Redefinir Senha</a>
    </div>

    <p style="font-size: 14px; color: #64748b;">
      Este link é válido por 1 hora. Se você não solicitou a redefinir a senha, por favor ignore este e-mail.
    </p>

    <p>Por questões de segurança, nunca compartilhe este link com terceiros.</p>
  `);

  const text = `
Redefinição de Senha

Olá, ${data.recipientName}!

Recebemos uma solicitação para redefinir a senha da sua conta.

Acesse: ${data.resetUrl}

Este link é válido por 1 hora.

Se você não solicitou a redefinir a senha, por favor ignore este e-mail.
  `.trim();

  return {
    subject: 'Redefinição de Senha - Connect For People',
    html,
    text,
  };
}

export function accountActivatedTemplate(data: AccountActivatedEmailData): EmailTemplate {
  const html = wrapHtml(`
    <h2 style="color: #024383; margin-top: 0;">Conta Ativada com Sucesso!</h2>

    <p>Olá, <strong>${data.recipientName}</strong>!</p>

    <p>Sua conta na plataforma <strong>Connect For People</strong> foi ativada com sucesso. Agora você já pode acessar todos os recursos disponíveis para o seu projeto.</p>

    <p>Sempre que precisar acessar a plataforma, utilize o link abaixo:</p>

    <div style="text-align: center;">
      <a href="${data.loginUrl}" style="${buttonStyle}">Acessar Plataforma</a>
    </div>

    <p>Recomendamos que você salve este link nos seus favoritos para facilitar o acesso futuro.</p>

    <p>Desejamos muito sucesso na sua jornada!</p>

    <p>Atenciosamente,<br><strong>Equipe Connect For People</strong></p>
  `);

  const text = `
Conta Ativada com Sucesso!

Olá, ${data.recipientName}!

Sua conta na plataforma Connect For People foi ativada com sucesso.

Para acessar a plataforma sempre que precisar, utilize o link: ${data.loginUrl}

Atenciosamente,
Equipe Connect For People
  `.trim();

  return {
    subject: 'Bem-vindo(a)! Sua conta foi ativada - Connect For People',
    html,
    text,
  };
}
