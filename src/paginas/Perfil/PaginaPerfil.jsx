import { useState, useEffect } from 'react';
import { supabase } from '../../servicos/supabase';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { rastrear } from '../../servicos/rastreamento';
import { usarEquipe } from '../../contextos/EquipeContexto';

// Novos componentes modularizados
import VisualizacaoPerfil from './componentes/VisualizacaoPerfil';
import EdicaoPerfilForms from './componentes/EdicaoPerfilForms';

import './PaginaPerfil.css';

const calcularIdade = (dataNasc) => {
  if (!dataNasc) return null;
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
};

const PaginaPerfil = ({ aoVoltar, aoNavegar }) => {
  const { dadosUsuario, recarregarUsuario } = usarAutenticacao();
  const { equipes } = usarEquipe();
  const [editando, setEditando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [fazendoUpload, setFazendoUpload] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  
  const [modalidades, setModalidades] = useState([]);
  const [carregandoModalidades, setCarregandoModalidades] = useState(true);

  const [form, setForm] = useState({
    nome_completo: '', apelido: '', data_nascimento: '', genero: '',
    telefone: '', cep: '', rua: '', numero: '', complemento: '',
    bairro: '', cidade: '', estado: '', perfil_publico: true,
    compartilhar_whatsapp_match: true
  });

  // Carrega modalidades sempre que a página é montada (garante sincronia ao voltar de outras telas)
  useEffect(() => {
    if (dadosUsuario?.id) {
      carregarModalidades(dadosUsuario.id);
      buscarDadosUsuario(dadosUsuario.id);
    }
  }, []);

  const buscarDadosUsuario = async (userId) => {
    try {
      const { data, error } = await supabase.from('usuarios').select('*').eq('id', userId).single();
      if (!error && data) {
        setForm({
          nome_completo: data.nome_completo || '',
          apelido: data.apelido || '',
          data_nascimento: data.data_nascimento || '',
          genero: data.genero || '',
          telefone: data.telefone || '',
          cep: data.cep || '',
          rua: data.rua || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          cidade: data.cidade || '',
          estado: data.estado || '',
          esportes_interesse: data.esportes_interesse || [],
          perfil_publico: data.perfil_publico ?? true,
          compartilhar_whatsapp_match: data.compartilhar_whatsapp_match ?? true
        });
      }
    } catch (err) {
      console.error('Erro ao sincronizar dados:', err);
    }
  };

  // Preenche o formulário inicialmente com os dados do contexto
  useEffect(() => {
    if (dadosUsuario && !form.nome_completo) { // Só preenche se o form ainda estiver vazio
      setForm({
        nome_completo: dadosUsuario.nome_completo || '',
        apelido: dadosUsuario.apelido || '',
        data_nascimento: dadosUsuario.data_nascimento || '',
        genero: dadosUsuario.genero || '',
        telefone: dadosUsuario.telefone || '',
        cep: dadosUsuario.cep || '',
        rua: dadosUsuario.rua || '',
        numero: dadosUsuario.numero || '',
        complemento: dadosUsuario.complemento || '',
        bairro: dadosUsuario.bairro || '',
        cidade: dadosUsuario.cidade || '',
        estado: dadosUsuario.estado || '',
        esportes_interesse: dadosUsuario.esportes_interesse || [],
        perfil_publico: dadosUsuario.perfil_publico ?? true,
        compartilhar_whatsapp_match: dadosUsuario.compartilhar_whatsapp_match ?? true
      });
      // carregarModalidades(dadosUsuario.id); // Removido daqui para evitar duplicação
      rastrear.pagina('Perfil', { publico: dadosUsuario.perfil_publico });
    }
  }, [dadosUsuario]);

  const carregarModalidades = async (userId) => {
    try {
      setCarregandoModalidades(true);
      const { data, error } = await supabase
        .from('jogador_modalidades')
        .select('*')
        .eq('usuario_id', userId)
        .order('criado_em', { ascending: false });
        
      if (error) throw error;
      setModalidades(data || []);
    } catch (err) {
      console.error('Erro ao buscar modalidades:', err);
    } finally {
      setCarregandoModalidades(false);
    }
  };

  const set = (campo) => (e) => {
    const novoValor = e.target.value;
    setForm(prev => {
      const novoForm = { ...prev, [campo]: novoValor };
      if (campo === 'data_nascimento') {
        const idade = calcularIdade(novoValor);
        if (idade !== null) {
          if (idade < 18) {
            novoForm.perfil_publico = false;
            novoForm.compartilhar_whatsapp_match = false;
          } else {
            novoForm.perfil_publico = true;
            novoForm.compartilhar_whatsapp_match = true;
          }
        }
      }
      return novoForm;
    });
  };

  const buscarCep = async () => {
    const cepLimpo = form.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          rua: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setBuscandoCep(false);
      rastrear.clique('perfil_buscar_cep', 'Realizou busca de CEP no perfil');
    }
  };

  const salvarPerfil = async (e) => {
    e.preventDefault();
    setMensagem({ tipo: '', texto: '' });
    setCarregando(true);

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          ...form,
          telefone: (form.telefone || '').replace(/\D/g, '')
        })
        .eq('id', dadosUsuario.id);

      if (error) throw error;
      
      setMensagem({ tipo: 'sucesso', texto: 'Perfil atualizado com sucesso!' });
      if (recarregarUsuario) await recarregarUsuario();
      setEditando(false);
      rastrear.clique('perfil_salvar', 'Perfil atualizado com sucesso');
      
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar: ${err.message}` });
    } finally {
      setCarregando(false);
    }
  };

  const uploadAvatar = async (evento) => {
    try {
      setFazendoUpload(true);
      const arquivo = evento.target.files[0];
      if (!arquivo) return;

      const extensao = arquivo.name.split('.').pop();
      const caminho = `${dadosUsuario.id}/${Date.now()}.${extensao}`;

      const { error: uploadError } = await supabase.storage.from('avatares').upload(caminho, arquivo);
      if (uploadError) throw uploadError;

      const { data: imgData } = supabase.storage.from('avatares').getPublicUrl(caminho);
      await supabase.from('usuarios').update({ foto_url: imgData.publicUrl }).eq('id', dadosUsuario.id);

      if (recarregarUsuario) await recarregarUsuario();
      rastrear.clique('perfil_foto_upload', 'Foto de perfil atualizada');
    } catch (err) {
      console.error('Erro no upload:', err);
    } finally {
      setFazendoUpload(false);
    }
  };

  if (!dadosUsuario) return <div className="carregando-perfil">Carregando perfil...</div>;

  const idadeAtual = calcularIdade(form.data_nascimento);

  return (
    <div className="perfil-container-mestre">
      {mensagem.texto && (
        <div className={`alerta-global ${mensagem.tipo}`}>
          {mensagem.texto}
        </div>
      )}

      {!editando ? (
        <VisualizacaoPerfil 
          dadosUsuario={dadosUsuario}
          modalidades={modalidades}
          idade={idadeAtual}
          totalEquipes={equipes.length}
          totalEsportes={form.esportes_interesse?.length || dadosUsuario?.esportes_interesse?.length || 0}
          aoEditar={() => {
            setEditando(true);
            rastrear.clique('perfil_editar_abrir', 'Entrou no modo de edição do perfil');
          }}
          aoNavegar={aoNavegar}
        />
      ) : (
        <EdicaoPerfilForms 
          form={form}
          setForm={setForm}
          set={set}
          dadosUsuario={dadosUsuario}
          fazendoUpload={fazendoUpload}
          uploadAvatar={uploadAvatar}
          buscarCep={buscarCep}
          buscandoCep={buscandoCep}
          salvarPerfil={salvarPerfil}
          carregando={carregando}
          ehMenorDeIdade={idadeAtual < 18}
          aoCancelar={() => setEditando(false)}
        />
      )}
    </div>
  );
};

export default PaginaPerfil;
