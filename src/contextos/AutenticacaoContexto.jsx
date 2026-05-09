import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../servicos/supabase';

const AutenticacaoContexto = createContext({});

// O controle de Root agora é feito via coluna 'eh_root' na tabela 'usuarios' do banco de dados.

export const usarAutenticacao = () => {
    const contexto = useContext(AutenticacaoContexto);
    if (!contexto) {
        throw new Error('usarAutenticacao deve ser usado dentro de um AutenticacaoProvedor');
    }
    return contexto;
};

export const AutenticacaoProvedor = ({ children }) => {
    const [usuario, setUsuario] = useState(null);
    const [dadosUsuario, setDadosUsuario] = useState(() => {
        const salvo = localStorage.getItem('playhub_perfil_cache');
        return salvo ? JSON.parse(salvo) : null;
    });
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        // 1. Verificar sessão atual imediatamente
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUsuario(session.user);
                carregarDadosUsuario(session.user.id);
            } else {
                setCarregando(false);
            }
        });

        // 2. Escutar mudanças na autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                setUsuario(null);
                setDadosUsuario(null);
                localStorage.removeItem('playhub_perfil_cache');
                setCarregando(false);
            } else if (session?.user) {
                setUsuario(session.user);
                // Atualiza em background se já tivermos dados, ou bloqueia se não
                carregarDadosUsuario(session.user.id);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const carregarDadosUsuario = async (userId) => {
        try {
            const chaveAcesso = `playhub_acesso_${userId}`;
            if (!sessionStorage.getItem(chaveAcesso)) {
                supabase.rpc('registrar_acesso').then(({ error }) => {
                    if (!error) sessionStorage.setItem(chaveAcesso, 'true');
                });
            }

            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('id', userId)
                .single();

            if (!error && data) {
                setDadosUsuario(data);
                localStorage.setItem('playhub_perfil_cache', JSON.stringify(data));
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setCarregando(false);
        }
    };

    const alternarVisibilidadePerfil = async () => {
        if (!dadosUsuario) return;
        const novoStatus = !dadosUsuario.perfil_publico;
        try {
            const { error } = await supabase
                .from('usuarios')
                .update({ perfil_publico: novoStatus })
                .eq('id', dadosUsuario.id);

            if (error) throw error;
            setDadosUsuario(prev => ({ ...prev, perfil_publico: novoStatus }));
            return { sucesso: true };
        } catch (error) {
            console.error('Erro alternar perfil:', error.message);
            return { sucesso: false, erro: error.message };
        }
    };

    const alternarWhatsAppMatch = async () => {
        if (!dadosUsuario) return { sucesso: false, erro: 'Sem dados' };
        
        const novoStatus = !dadosUsuario.compartilhar_whatsapp_match;
        try {
            const { error } = await supabase
                .from('usuarios')
                .update({ compartilhar_whatsapp_match: novoStatus })
                .eq('id', dadosUsuario.id);

            if (error) throw error;
            setDadosUsuario(prev => ({ ...prev, compartilhar_whatsapp_match: novoStatus }));
            return { sucesso: true };
        } catch (error) {
            console.error('Erro alternar whatsapp:', error.message);
            return { sucesso: false, erro: error.message };
        }
    };

    const ativarPrivacidadeTotal = async () => {
        if (!dadosUsuario) return { sucesso: false, erro: 'Sem dados' };
        try {
            const { error } = await supabase
                .from('usuarios')
                .update({ 
                    perfil_publico: true, 
                    compartilhar_whatsapp_match: true 
                })
                .eq('id', dadosUsuario.id);

            if (error) throw error;
            setDadosUsuario(prev => ({ 
                ...prev, 
                perfil_publico: true, 
                compartilhar_whatsapp_match: true 
            }));
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao ativar privacidade total:', error.message);
            return { sucesso: false, erro: error.message };
        }
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Erro ao encerrar sessão:', error.message);
    };

    // Abreviação para verificar se é o dono root (via banco ou e-mail mestre vitalício)
    const ehRootAdmin = dadosUsuario?.eh_root === true || 
                        usuario?.email === 'michelssouza@gmail.com';

    const ehSuperAdmin = dadosUsuario?.eh_super_admin === true;

    // Função para verificar permissões granulares
    const temPermissao = (chave) => {
        // Root sempre tem permissão total
        if (ehRootAdmin) return true;
        
        // Super Admin (Co-Admin) depende das permissões granulares no JSON
        if (ehSuperAdmin) {
            return dadosUsuario?.admin_permissoes?.[chave] === true;
        }
        return false;
    };

    const valor = {
        usuario,
        dadosUsuario,
        carregando,
        ehRootAdmin,
        ehSuperAdmin,
        temPermissao,
        estaLogado: !!usuario,
        logout,
        recarregarUsuario: () => usuario && carregarDadosUsuario(usuario.id),
        alternarVisibilidadePerfil,
        alternarWhatsAppMatch,
        ativarPrivacidadeTotal
    };

    return (
        <AutenticacaoContexto.Provider value={valor}>
            {carregando ? (
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100vh',
                    width: '100vw',
                    backgroundColor: '#020617', // --fundo-profundo
                    color: '#0ea5e9', // --primaria
                    gap: '15px',
                    fontFamily: 'sans-serif'
                }}>
                    <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        border: '3px solid rgba(14, 165, 233, 0.2)',
                        borderTopColor: '#0ea5e9', 
                        borderRadius: '50%', 
                        animation: 'spin 1s linear infinite'
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Iniciando PlayHub...</span>
                </div>
            ) : children}
        </AutenticacaoContexto.Provider>
    );
};
