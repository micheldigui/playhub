import { User, Stars } from 'lucide-react';
import { rastrear } from '../../../servicos/rastreamento';

const SecaoFotoCadastro = ({ fotoPreview, handleFotoChange }) => {
  
  const handleInputClick = () => {
    rastrear.clique('clique_escolher_foto', 'Usuário clicou no círculo de foto de perfil');
    document.getElementById('foto-input').click();
  };

  return (
    <div className="auth-foto-registro">
      <label className="auth-foto-label">Foto do Perfil</label>
      
      <div className="auth-foto-wrapper">
        {!fotoPreview && (
          <div className="badge-foto-recomendada">
             Recomendado
          </div>
        )}

        {/* Container com Destaque Premium para aumentar conversão */}
        <div 
          className={`auth-foto-preview destaque-premium ${fotoPreview ? 'tem-foto' : ''}`} 
          onClick={handleInputClick}
        >
          {fotoPreview ? (
            <img src={fotoPreview} alt="Preview" />
          ) : (
            <div className="auth-foto-placeholder">
              <User size={44} />
              <span>Escolher Foto</span>
            </div>
          )}
        </div>
      </div>

      <p className="frase-incentivo-foto">
        Atletas com foto recebem <strong>3x mais convites</strong> de equipes!
      </p>

      <input 
        id="foto-input"
        type="file" 
        accept="image/*" 
        onChange={handleFotoChange} 
        style={{ display: 'none' }}
        tabIndex="1"
      />
    </div>
  );
};

export default SecaoFotoCadastro;
