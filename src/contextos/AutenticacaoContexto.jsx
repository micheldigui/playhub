import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../servicos/supabase';

const AutenticacaoContexto = createContext({});

// E-mail do proprietário root do sistema
const EMAIL_ROOT = 'michelssouza@gmail.com';

export const usarAutenticacao = () => {
    const contexto = useContext(AutenticacaoContexto);
    if (!contexto) {
        throw new Error('usarAutenticacao deve ser usado dentro de um AutenticacaoProvedor');
    }
    return contexto;
};

export const AutenticacaoProvedor = ({ children }) => {
    const [usuario, setUsuario] = useState(null);
    const [dadosUsuario, setDadosUsuario] = useState(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        // Verificar sessão atual
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUsuario(session?.user ?? null);
            if (session?.user) carregarDadosUsuario(session.user.id);
            else setCarregando(false);
        });

        // Escutar mudanças na autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUsuario(session?.user ?? null);
            if (session?.user) carregarDadosUsuario(session.user.id);
            else {
                setDadosUsuario(null);
                setCarregando(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Flag para evitar múltiplos registros de acesso na mesma sessão de navegador
    const [acessoRegistrado, setAcessoRegistrado] = useState(false);

    const carregarDadosUsuario = async (userId) => {
        try {
            // Trava de redundância: Registra acesso apenas uma vez por carregamento do site
            // sessionStorage persiste entre F5s mas limpa ao fechar a aba
            const chaveAcesso = `playhub_acesso_${userId}`;
            const jaRegistradoNestaAba = sessionStorage.getItem(chaveAcesso);

            if (!jaRegistradoNestaAba) {
                supabase.rpc('registrar_acesso').then(({ error }) => {
                    if (!error) {
                        sessionStorage.setItem(chaveAcesso, 'true');
                    }
                });
            }

            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            setDadosUsuario(data);
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error.message);
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

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Erro ao encerrar sessão:', error.message);
    };

    // Abreviação para verificar se é o dono root
    const ehRootAdmin = dadosUsuario?.email === EMAIL_ROOT;

    // Função para verificar permissões granulares
    const temPermissao = (chave) => {
        // Root sempre tem permissão
        if (ehRootAdmin) return true;
        // Super Admin (Co-Admin) precisa ter a flag no JSON admin_permissoes
        if (dadosUsuario?.eh_super_admin && dadosUsuario?.admin_permissoes?.[chave] === true) {
            return true;
        }
        return false;
    };

    const valor = {
        usuario,
        dadosUsuario,
        carregando,
        ehRootAdmin,
        ehSuperAdmin: ehRootAdmin || (dadosUsuario?.eh_super_admin === true),
        temPermissao,
        estaLogado: !!usuario,
        logout,
        recarregarUsuario: () => usuario && carregarDadosUsuario(usuario.id),
        alternarVisibilidadePerfil,
        alternarWhatsAppMatch
    };

    return (
        <AutenticacaoContexto.Provider value={valor}>
            {!carregando && children}
        </AutenticacaoContexto.Provider>
    );
};
