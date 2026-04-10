import React, { useState } from 'react';
import { 
  User, 
  Calendar, 
  Mail, 
  Phone, 
  MapPin, 
  Search, 
  AlertCircle, 
  Settings,
  Camera,
  ArrowLeft
} from 'lucide-react';
import Botao from '../../../componentes/Botao/Botao';
import Tooltip from '../../../componentes/Tooltip/Tooltip';
import { GENEROS } from '../../Autenticacao/CadastroConstants';

const EdicaoPerfilForms = ({ 
  form, 
  setForm, 
  set, 
  dadosUsuario, 
  fazendoUpload, 
  uploadAvatar, 
  buscarCep, 
  buscandoCep, 
  salvarPerfil, 
  carregando,
  ehMenorDeIdade,
  aoCancelar
}) => {
  const [exibirPrivacidade, setExibirPrivacidade] = useState(ehMenorDeIdade);

  return (
    <div className="perfil-edit-wrapper animacao-entrada">
      <div className="perfil-edit-header">
        <button className="btn-voltar-perfil" onClick={aoCancelar}>
          <ArrowLeft size={20} />
          <span>Voltar para o Perfil</span>
        </button>
        <h2>Editar Perfil</h2>
      </div>

      <form onSubmit={salvarPerfil} className="perfil-form-moderno">
        {/* Seção de Avatar */}
        <div className="perfil-cartao-edit">
          <span className="cartao-titulo">Foto do Perfil</span>
          <div className="perfil-avatar-container-edit">
            <div className={`avatar-wrapper-edit ${fazendoUpload ? 'uploading' : ''}`}>
              {dadosUsuario?.foto_url ? (
                <img src={dadosUsuario.foto_url} alt="Avatar" />
              ) : (
                <div className="avatar-placeholder-edit">
                  {form.nome_completo?.charAt(0).toUpperCase()}
                </div>
              )}
              <label htmlFor="upload-avatar-edit" className="avatar-overlay-edit">
                <Camera size={24} />
                <input 
                  id="upload-avatar-edit" 
                  type="file" 
                  accept="image/*" 
                  onChange={uploadAvatar} 
                  disabled={fazendoUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <p className="ajuda-texto-foto">Recomendado: Imagem quadrada, máx 2MB.</p>
          </div>
        </div>

        {/* Dados Pessoais */}
        <div className="perfil-cartao-edit">
          <span className="cartao-titulo">Dados Pessoais</span>
          
          <div className="grupo-input-moderno">
            <label>E-mail (Login)</label>
            <div className="campo-input-moderno desabilitado">
              <Mail size={16} />
              <input type="email" value={dadosUsuario?.email} disabled />
            </div>
          </div>

          <div className="grade-2-moderna">
            <div className="grupo-input-moderno">
              <label>Nome completo *</label>
              <div className="campo-input-moderno">
                <User size={16} />
                <input 
                  required 
                  value={form.nome_completo} 
                  onChange={set('nome_completo')} 
                  placeholder="Seu nome"
                />
              </div>
            </div>
            <div className="grupo-input-moderno">
              <label>Apelido @</label>
              <div className="campo-input-moderno">
                <User size={16} />
                <input value={form.apelido} onChange={set('apelido')} placeholder="Seu @nome" />
              </div>
            </div>
          </div>

          <div className="grade-2-moderna">
            <div className="grupo-input-moderno">
              <label>Data de Nascimento *</label>
              <div className="campo-input-moderno">
                <Calendar size={16} />
                <input type="date" required value={form.data_nascimento} onChange={set('data_nascimento')} />
              </div>
            </div>
            <div className="grupo-input-moderno">
              <label>Gênero *</label>
              <div className="campo-input-moderno">
                <User size={16} />
                <select required value={form.genero} onChange={set('genero')}>
                  <option value="">Selecione...</option>
                  {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grupo-input-moderno">
            <label>WhatsApp / Telefone</label>
            <div className="campo-input-moderno">
              <Phone size={16} />
              <input 
                type="tel"
                value={form.telefone}
                onChange={(e) => setForm(prev => ({ ...prev, telefone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          {/* Configurações de Privacidade (Progressive Disclosure) */}
          <div className="privacidade-ajuste-perfil">
            {!ehMenorDeIdade && (
              <button 
                type="button" 
                className="btn-toggle-privacidade-perfil"
                onClick={() => setExibirPrivacidade(!exibirPrivacidade)}
              >
                <Settings size={14} />
                {exibirPrivacidade ? 'Ocultar opções avançadas' : 'Configurações de Privacidade'}
              </button>
            )}

            {exibirPrivacidade && (
              <div className="container-privacidade-expansivel">
                {ehMenorDeIdade && (
                  <div className="aviso-privacidade-menor">
                    <AlertCircle size={14} /> Privacidade obrigatória para menores de 18 anos.
                  </div>
                )}
                
                <div className="grupo-checkbox-moderno">
                  <label className={`toggle-privacidade ${ehMenorDeIdade ? 'bloqueado' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={!form.perfil_publico}
                      onChange={(e) => !ehMenorDeIdade && set('perfil_publico')({ target: { value: !e.target.checked } })}
                      disabled={ehMenorDeIdade}
                    />
                    <span className="toggle-label">Perfil Privado</span>
                  </label>
                  {!form.perfil_publico && !ehMenorDeIdade && (
                    <p className="alerta-privacidade-perfil">⚠️ Você não aparecerá nas buscas de capitães.</p>
                  )}
                </div>

                <div className="grupo-checkbox-moderno">
                  <label className={`toggle-privacidade ${ehMenorDeIdade ? 'bloqueado' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={!form.compartilhar_whatsapp_match}
                      onChange={(e) => !ehMenorDeIdade && setForm(prev => ({ ...prev, compartilhar_whatsapp_match: !e.target.checked }))}
                      disabled={ehMenorDeIdade}
                    />
                    <span className="toggle-label">Ocultar WhatsApp</span>
                  </label>
                  {!form.compartilhar_whatsapp_match && !ehMenorDeIdade && (
                    <p className="alerta-privacidade-perfil">⚠️ Times terão mais dificuldade em te convidar.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Endereço */}
        <div className="perfil-cartao-edit">
          <span className="cartao-titulo">Localização</span>
          
          <div className="grade-cep-moderna">
            <div className="grupo-input-moderno">
              <label>CEP</label>
              <div className="campo-input-moderno">
                <MapPin size={16} />
                <input 
                  value={form.cep} 
                  onChange={(e) => setForm(prev => ({ ...prev, cep: e.target.value }))}
                  placeholder="00000-000"
                />
              </div>
            </div>
            <button type="button" className="btn-buscar-cep-perfil" onClick={buscarCep} disabled={buscandoCep}>
              {buscandoCep ? 'Buscando...' : 'Buscar Endereço'}
            </button>
          </div>

          <div className="grupo-input-moderno">
            <label>Rua / Logradouro</label>
            <div className="campo-input-moderno">
              <MapPin size={16} />
              <input 
                value={form.rua} 
                onChange={set('rua')} 
                placeholder="Ex: Av. das Palmeiras"
              />
            </div>
          </div>

          <div className="grade-2-moderna">
            <div className="grupo-input-moderno">
              <label>Número</label>
              <div className="campo-input-moderno">
                <MapPin size={16} />
                <input 
                  value={form.numero} 
                  onChange={set('numero')} 
                  placeholder="123"
                />
              </div>
            </div>
            <div className="grupo-input-moderno">
              <label>Complemento</label>
              <div className="campo-input-moderno">
                <MapPin size={16} />
                <input 
                  value={form.complemento} 
                  onChange={set('complemento')} 
                  placeholder="Apto, Bloco, etc."
                />
              </div>
            </div>
          </div>

          <div className="grupo-input-moderno">
            <label>Bairro</label>
            <div className="campo-input-moderno">
              <MapPin size={16} />
              <input value={form.bairro} onChange={set('bairro')} />
            </div>
          </div>

          <div className="grade-cidade-estado">
            <div className="grupo-input-moderno">
              <label>Cidade</label>
              <div className="campo-input-moderno">
                <MapPin size={16} />
                <input value={form.cidade} onChange={set('cidade')} />
              </div>
            </div>
            <div className="grupo-input-moderno input-uf">
              <label>Estado (UF)</label>
              <div className="campo-input-moderno">
                <select value={form.estado} onChange={set('estado')}>
                  <option value="">UF</option>
                  {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
                    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
                    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="acoes-perfil-edit">
          <Botao type="submit" disabled={carregando} estilo="primario">
            {carregando ? 'Salvando...' : 'Salvar Alterações'}
          </Botao>
        </div>
      </form>
    </div>
  );
};

export default EdicaoPerfilForms;
