import React from 'react';
import { ArrowLeft, FileText, Globe, ShieldCheck } from 'lucide-react';

const PaginaLegal = ({ titulo, subtitulo, conteudo, aoVoltar }) => {
    return (
        <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            <header style={{ marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <button 
                    onClick={aoVoltar}
                    style={{ 
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                        color: '#f8fafc', padding: '10px', borderRadius: '12px', cursor: 'pointer', 
                        display: 'flex', transition: 'all 0.2s' 
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.03em', marginBottom: '4px' }}>
                        {titulo}
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>{subtitulo}</p>
                </div>
            </header>

            <div className="conteudo-legal" style={{ 
                background: 'rgba(15, 23, 42, 0.4)', 
                padding: '2.5rem', 
                borderRadius: '24px', 
                border: '1px solid rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                lineHeight: '1.8',
                fontSize: '1.05rem'
            }}>
                {conteudo}
            </div>

            <footer style={{ marginTop: '3rem', textAlign: 'center', padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                        <ShieldCheck size={18} /> Proteção de Dados
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                        <Globe size={18} /> PlayHub Global
                    </div>
                </div>
                <p style={{ color: '#475569', fontSize: '0.85rem' }}>Última atualização: Março de 2026</p>
            </footer>

            <style>{`
                .conteudo-legal h2 { color: #f8fafc; font-size: 1.4rem; margin: 2rem 0 1rem 0; font-weight: 700; }
                .conteudo-legal p { margin-bottom: 1.5rem; }
                .conteudo-legal ul { margin-bottom: 2rem; padding-left: 1.5rem; }
                .conteudo-legal li { margin-bottom: 0.8rem; }
            `}</style>
        </div>
    );
};

export const PaginaTermos = ({ aoVoltar }) => {
    const conteudo = (
        <>
            <p>Seja bem-vindo ao PlayHub. Ao utilizar nossa plataforma, você concorda com os termos e condições descritos abaixo. Leia-os atentamente.</p>
            
            <h2>1. Aceitação dos Termos</h2>
            <p>Ao se cadastrar no PlayHub, você declara ter pelo menos 18 anos ou possuir autorização dos responsáveis. O uso contínuo da plataforma implica na aceitação de todas as regras vigentes.</p>

            <h2>2. Cadastro e Segurança</h2>
            <p>Você é responsável por manter a confidencialidade de suas credenciais de acesso. O PlayHub não se responsabiliza por perdas resultantes do uso não autorizado de sua conta por terceiros.</p>

            <h2>3. Uso da Plataforma</h2>
            <p>O PlayHub é uma ferramenta de gestão e organização esportiva. É proibido:</p>
            <ul>
                <li>Utilizar a plataforma para fins ilegais ou não autorizados.</li>
                <li>Publicar conteúdo ofensivo, discriminatório ou que viole direitos de terceiros.</li>
                <li>Interferir no funcionamento técnico do sistema.</li>
            </ul>

            <h2>4. Gestão de Equipes e Pagamentos</h2>
            <p>A responsabilidade pela gestão financeira e arrecadação de mensalidades é exclusiva dos administradores das equipes. O PlayHub fornece a ferramenta de controle, mas não atua como intermediário financeiro nas transações entre capitães e atletas.</p>

            <h2>5. Limitação de Responsabilidade</h2>
            <p>O PlayHub não se responsabiliza por acidentes físicos, disputas entre membros ou qualquer dano ocorrido durante a prática esportiva organizada através da plataforma.</p>
        </>
    );

    return <PaginaLegal titulo="Termos de Uso" subtitulo="Nossas regras e compromissos com você." conteudo={conteudo} aoVoltar={aoVoltar} />;
};

export const PaginaPrivacidade = ({ aoVoltar }) => {
    const conteudo = (
        <>
            <p>Sua privacidade é nossa prioridade. Esta política explica como coletamos, usamos e protegemos seus dados pessoais dentro do sistema PlayHub.</p>
            
            <h2>1. Coleta de Informações</h2>
            <p>Coletamos os seguintes dados para funcionamento do perfil:</p>
            <ul>
                <li>Nome, apelido, e e-mail.</li>
                <li>Foto de perfil e dados técnicos esportivos (posição, nível).</li>
                <li>Histórico de frequência e cartões para o sistema Fair Play.</li>
            </ul>

            <h2>2. Uso dos Dados</h2>
            <p>Seus dados são utilizados exclusivamente para:</p>
            <ul>
                <li>Personalizar sua experiência nas equipes.</li>
                <li>Permitir que administradores gerenciem convites e escalações.</li>
                <li>Notificar você sobre eventos e mensagens do sistema.</li>
            </ul>

            <h2>3. Compartilhamento</h2>
            <p>O PlayHub não vende seus dados para terceiros. Seus dados de perfil esportivo são visíveis apenas para outros membros da sua equipe ou em buscas públicas se você habilitar essa opção nas configurações de privacidade.</p>

            <h2>4. Exclusão de Dados</h2>
            <p>Você tem o direito de solicitar a exclusão total dos seus dados a qualquer momento através do menu de Configurações. Uma vez solicitada, a exclusão é permanente.</p>
        </>
    );

    return <PaginaLegal titulo="Privacidade" subtitulo="Como cuidamos das suas informações." conteudo={conteudo} aoVoltar={aoVoltar} />;
};
