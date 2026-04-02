import React from 'react';
import {
  Trophy, Users, Calendar, Shield,
  ArrowRight, CheckCircle2, Star, Zap,
  Smartphone, Share2, Gavel, Wallet
} from 'lucide-react';
import InfoTooltip from '../../componentes/Tooltip/InfoTooltip';
import './LandingPage.css';

const LandingPage = ({ aoLogin }) => {
  return (
    <div className="landing-container">
      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <img src="/icon_ph_oficial_cf.png" alt="PlayHub Logo" style={{ borderRadius: '4px' }} />
          <span>PlayHub</span>
        </div>
        <button className="btn-hero-secondary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }} onClick={aoLogin}>
          Entrar
        </button>
      </nav>

      {/* ── Hero ── */}
      <header className="hero-section">
        <div className="hero-bg-glow" />
        <span className="section-tag" style={{ animation: 'slideUp 0.8s ease-out' }}>Gestão de Partidas Inteligente</span>
        <h1 className="hero-headline">
          Tudo o que seu time precisa <br />
          <span style={{ color: '#38bdf8' }}>em um só lugar.</span>
        </h1>
        <p className="hero-subheadline">
          A plataforma completa para organizar suas partidas, gerenciar o caixa do time e o nível dos seus jogadores. 
          Feito de jogador para jogador.
        </p>
        <div className="hero-cta-group">
          <button className="btn-hero-primary" onClick={aoLogin}>
            Começar Agora <ArrowRight size={20} style={{ marginLeft: '8px', verticalAlign: 'middle' }} />
          </button>
          <button className="btn-hero-secondary" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
            Conhecer Funcionalidades
          </button>
        </div>
      </header>

      {/* ── Features ── */}
      <section id="features" className="features-section">
        <span className="section-tag">Funcionalidades</span>
        <h2 className="section-title">Tudo para uma gestão organizada</h2>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-box" style={{ color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)' }}>
              <Users size={32} />
            </div>
            <h3>
              Capitão e Vice Capitão
              <InfoTooltip texto="Defina quem é o Capitão e quem ajuda como Vice Capitão. Simples e sem complicação." />
            </h3>
            <p>Controle seus jogadores, cargos e convites. Organize quem faz parte do time e escolha seus líderes.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box" style={{ color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)' }}>
              <Wallet size={32} />
            </div>
            <h3>
              Caixa do Time
              <InfoTooltip texto="Controle quem paga por mês e quem paga por partida. Saiba sempre quem está em dia." />
            </h3>
            <p>Gerencie pagamentos e mensalidades com transparência. Relatórios simples para você nunca mais perder o controle do dinheiro.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box" style={{ color: '#f87171', background: 'rgba(248, 113, 113, 0.1)' }}>
              <Gavel size={32} />
            </div>
            <h3>
              Fair Play e VAR
              <InfoTooltip texto="Sistema de cartões que gera suspensões automáticas. O app avisa se o jogador está fora da partida!" />
            </h3>
            <p>Promova um jogo limpo. Registre os cartões de cada partida e deixe que o app controle as suspensões sozinho.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box" style={{ color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)' }}>
              <Share2 size={32} />
            </div>
            <h3>
              Lista para WhatsApp
              <InfoTooltip texto="Gere a lista de jogadores confirmados para mandar no grupo do seu time." />
            </h3>
            <p>Crie suas partidas e mande o link de presença direto no WhatsApp. A lista de jogadores atualiza em tempo real.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box" style={{ color: '#a855f7', background: 'rgba(168, 85, 247, 0.1)' }}>
              <Star size={32} />
            </div>
            <h3>Perfil do Jogador</h3>
            <p>Mostre sua posição e como você joga. Tenha seu histórico de partidas sempre à mão para todo mundo ver.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box" style={{ color: '#ec4899', background: 'rgba(236, 72, 153, 0.1)' }}>
              <Calendar size={32} />
            </div>
            <h3>Agenda de Partidas</h3>
            <p>Histórico de todos os jogos e as próximas partidas marcadas. Lista de espera automática para ninguém ficar de fora.</p>
          </div>
        </div>
      </section>

      {/* ── Seção de Instalação (Web App) ── */}
      <section className="install-section">
        <div className="install-content">
          <div className="install-text">
            <span className="section-tag">Acesso Rápido</span>
            <h2 className="section-title">Leve o PlayHub para a Partida</h2>
            <p>
              O PlayHub é um <strong>Web App</strong>. Você instala ele direto na tela do seu celular 
              sem baixar nada pesado. Sem frescura.
            </p>
            <ul className="install-benefits">
              <li><CheckCircle2 size={18} color="#38bdf8" /> Não ocupa memória do celular</li>
              <li><CheckCircle2 size={18} color="#38bdf8" /> Entra no app com um toque</li>
              <li><CheckCircle2 size={18} color="#38bdf8" /> Atualiza sozinho e é seguro</li>
            </ul>
          </div>
          <div className="install-visual">
            <div className="mockup-phone">
              <div className="mockup-screen">
                <img src="/icon_ph_oficial_cf.png" alt="App Icon" className="app-icon-floating" />
                <div className="mockup-home-info">
                  <span>PlayHub</span>
                  <p>Adicionar à tela de início</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="cta-final-section">
        <h2 className="section-title">Bora organizar seu time?</h2>
        <p className="hero-subheadline">
          Junte-se a milhares de jogadores e capitães que já usam o PlayHub para organizar suas partidas.
        </p>
        <button className="btn-hero-primary" onClick={aoLogin} style={{ padding: '1.2rem 3rem', fontSize: '1.1rem' }}>
          Criar Minha Conta Grátis
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="landing-logo" style={{ justifyContent: 'center', marginBottom: '1.5rem', opacity: 0.8 }}>
            <img src="/icon_ph_oficial_cf.png" alt="PlayHub Logo" style={{ borderRadius: '4px' }} />
            <span>PlayHub</span>
          </div>
          <p>© {new Date().getFullYear()} PlayHub - Organização de Partidas Simples.</p>
          <div className="footer-links">
             <a href="/privacidade" onClick={(e) => e.preventDefault()}>Privacidade</a>
             <a href="/termos" onClick={(e) => e.preventDefault()}>Termos de Uso</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
