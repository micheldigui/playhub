import React, { useState } from 'react';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../../contextos/AutenticacaoContexto';
import { ArrowLeft, Users, Calendar, DollarSign, FileText, Settings, Shield } from 'lucide-react';
import Botao from '../../../componentes/Botao/Botao';
import EquipeMembrosTab from './tabs/EquipeMembrosTab';
import EquipeConfiguracoesTab from './tabs/EquipeConfiguracoesTab';
import EquipePartidasTab from './tabs/EquipePartidasTab';
import '../PaginaEquipe.css';

const EquipeAdminDashboard = ({ aoVoltar }) => {
    const { equipeAtiva } = usarEquipe();
    const { ehSuperAdmin } = usarAutenticacao();
    const [abaAdminAtiva, setAbaAdminAtiva] = useState('membros');

    if (!equipeAtiva) {
        return <div className="p-8 text-center text-muted">Nenhuma equipe ativa selecionada.</div>;
    }

    const { papel, permissoes } = equipeAtiva;
    const isDono = papel === 'admin';
    const isSubAdmin = papel === 'sub_admin';

    // Se não for super admin, nem dono, nem sub-admin validado, bloqueia
    if (!ehSuperAdmin && !isDono && !isSubAdmin) {
        return (
            <div className="lista-vazia">
                <h2>Acesso Negado</h2>
                <p>Você não tem permissão para acessar o painel de gestão desta equipe.</p>
                <Botao onClick={aoVoltar}>Voltar</Botao>
            </div>
        );
    }

    // Função auxiliar para checar permissão
    const temPermissao = (perm) => ehSuperAdmin || isDono || (permissoes && permissoes.includes(perm));

    return (
        <div className="pagina-equipe animate-fade-in">
            <button className="btn-voltar-explorar" onClick={aoVoltar} style={{ marginBottom: '1rem' }}>
                <ArrowLeft size={18} /> Voltar à Equipe
            </button>

            <header className="gestao-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Shield size={28} color="var(--primaria)" />
                        Gestão: {equipeAtiva.nome}
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Painel administrativo exclusivo para gestores.</p>
                </div>
            </header>

            <nav className="equipe-abas" style={{ marginBottom: '2rem', overflowX: 'auto', flexWrap: 'nowrap', pb: '0.5rem' }}>
                {temPermissao('gerenciar_membros') && (
                    <button 
                        className={`aba ${abaAdminAtiva === 'membros' ? 'ativa' : ''}`}
                        onClick={() => setAbaAdminAtiva('membros')}
                    >
                        <Users size={18} /> Membros
                    </button>
                )}
                {temPermissao('gerenciar_partidas') && (
                    <button 
                        className={`aba ${abaAdminAtiva === 'partidas' ? 'ativa' : ''}`}
                        onClick={() => setAbaAdminAtiva('partidas')}
                    >
                        <Calendar size={18} /> Partidas
                    </button>
                )}
                {temPermissao('gerenciar_financeiro') && (
                    <button 
                        className={`aba ${abaAdminAtiva === 'financeiro' ? 'ativa' : ''}`}
                        onClick={() => setAbaAdminAtiva('financeiro')}
                    >
                        <DollarSign size={18} /> Financeiro
                    </button>
                )}
                {temPermissao('ver_relatorios') && (
                    <button 
                        className={`aba ${abaAdminAtiva === 'relatorios' ? 'ativa' : ''}`}
                        onClick={() => setAbaAdminAtiva('relatorios')}
                    >
                        <FileText size={18} /> Relatórios
                    </button>
                )}
                {(ehSuperAdmin || isDono) && (
                    <button 
                        className={`aba ${abaAdminAtiva === 'permissoes' ? 'ativa' : ''}`}
                        onClick={() => setAbaAdminAtiva('permissoes')}
                    >
                        <Shield size={18} /> Permissões
                    </button>
                )}
                {temPermissao('gerenciar_equipe') && (
                    <button 
                        className={`aba ${abaAdminAtiva === 'configuracoes' ? 'ativa' : ''}`}
                        onClick={() => setAbaAdminAtiva('configuracoes')}
                    >
                        <Settings size={18} /> Configurações
                    </button>
                )}
            </nav>

            <div className="admin-conteudo">
                {abaAdminAtiva === 'membros' && <EquipeMembrosTab />}
                {abaAdminAtiva === 'partidas' && <EquipePartidasTab />}
                {abaAdminAtiva === 'financeiro' && <div className="card-detalhe"><h3>Em breve (Migração FinanceTab)</h3></div>}
                {abaAdminAtiva === 'relatorios' && <div className="card-detalhe"><h3>Em breve (Migração ReportsTab)</h3></div>}
                {abaAdminAtiva === 'permissoes' && <div className="card-detalhe"><h3>Em breve (Migração PermissionsTab)</h3></div>}
                {abaAdminAtiva === 'configuracoes' && <EquipeConfiguracoesTab />}
            </div>
        </div>
    );
};

export default EquipeAdminDashboard;
