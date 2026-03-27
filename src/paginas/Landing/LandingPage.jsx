import React from 'react';
import { 
  Trophy, Users, Calendar, Shield, 
  ArrowRight, CheckCircle2, Star, Zap 
} from 'lucide-react';
import './LandingPage.css';

const LandingPage = ({ aoLogin }) => {
  return (
    <div className="landing-container">
      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <img src="/icon.svg" alt="PlayHub Logo" />
          <span>PlayHub</span>
        </div>
        <button className="btn-hero-secondary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }} onClick={aoLogin}>
          Entrar
        </button>
      </nav>

      {/* ── Hero ── */}
      <header className="hero-section">
        <div className="hero-bg-glow" />
        <span className="section-tag" style={{ animation: 'slideUp 0.8s ease-out' }}>Onde o jogo acontece</span>
        <h1 className="hero-headline">
          Sua equipe, suas regras, <br />
          <span style={{ color: '#38bdf8' }}>seu próximo nível.</span>
        </h1>
        <p className="hero-subheadline">
          A plataforma definitiva para gestores de equipes e atletas. 
          Organize partidas, controle mensalidades e encontre os melhores parceiros de jogo em um só lugar.
        </p>
        <div className="hero-cta-group">
          <button className="btn-hero-primary" onClick={aoLogin}>
            Começar Agora <ArrowRight size={20} style={{ marginLeft: '8px', verticalAlign: 'middle' }} />
          </button>
          <button className="btn-hero-secondary" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
            Ver Funcionalidades
          </button>
        </div>
      </header>

      {/* ── Features ── */}
      <section id="features" className="features-section">
        <span className="section-tag">Funcionalidades</span>
        <h2 className="section-title">Tudo o que você precisa para brilhar</h2>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-box">
              <Users size={32} />
            </div>
            <h3>Gestão de Elenco</h3>
            <p>Controle membros, cargos e convites de forma simples e intuitiva. Tenha o controle total da sua equipe.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">
              <Calendar size={32} />
            </div>
            <h3>Partidas em Tempo Real</h3>
            <p>Crie jogos, gerencie inscritos e receba notificações instantâneas. Nunca mais perca o horário do jogo.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">
              <Shield size={32} />
            </div>
            <h3>Controle Financeiro</h3>
            <p>Gerencie mensalidades de atletas e pagamentos de avulsos com relatórios claros e automáticos.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">
              <Star size={32} />
            </div>
            <h3>Perfil do Atleta</h3>
            <p>Mostre suas habilidades, posições favoritas e nível técnico. Seja descoberto por grandes equipes.</p>
          </div>

          <div className="feature-card" style={{ border: '1px solid rgba(244, 63, 94, 0.2)', background: 'rgba(244, 63, 94, 0.05)' }}>
            <div className="feature-icon-box" style={{ color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)' }}>
              <Zap size={32} />
            </div>
            <h3>Passar a Bola</h3>
            <p>A funcionalidade que gera engajamento! Dê um toque na bola de outro atleta: se ele retribuir, é <strong>Match</strong> e vocês trocam WhatsApp na hora.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">
              <Trophy size={32} />
            </div>
            <h3>Ranking e Estatísticas</h3>
            <p>Acompanhe o desempenho da sua equipe e suba no ranking da maior comunidade esportiva amadora.</p>
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="hero-section" style={{ padding: '8rem 2rem', background: 'rgba(56, 189, 248, 0.02)' }}>
        <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Pronto para entrar em campo?</h2>
        <p className="hero-subheadline" style={{ marginBottom: '3rem' }}>
          Junte-se a milhares de atletas e gestores que já transformaram a forma de organizar seus esportes.
        </p>
        <button className="btn-hero-primary" onClick={aoLogin} style={{ padding: '1.5rem 4rem', fontSize: '1.25rem' }}>
          Criar Minha Conta Grátis
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="landing-logo" style={{ justifyContent: 'center', marginBottom: '1.5rem', opacity: 0.8 }}>
            <img src="/icon.svg" alt="PlayHub Logo" />
            <span>PlayHub</span>
          </div>
          <p>© {new Date().getFullYear()} PlayHub - Todos os direitos reservados.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>A melhor plataforma para gestão esportiva do Brasil.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
