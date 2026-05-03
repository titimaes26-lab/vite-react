export const APP_STYLES = `
        * { box-sizing: border-box; }
        html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

        /* ── Hover cards ── */
        .hovcard { transition: box-shadow 0.22s cubic-bezier(.4,0,.2,1), transform 0.18s cubic-bezier(.4,0,.2,1) !important; }
        .hovcard:hover { box-shadow: 0 8px 28px rgba(23,18,14,0.14), 0 2px 6px rgba(23,18,14,0.07) !important; transform: translateY(-2px) !important; }
        .hovcard:active { transform: translateY(0px) !important; box-shadow: 0 2px 8px rgba(23,18,14,0.08) !important; }

        /* ── Buttons ── */
        button { transition: filter 0.14s, transform 0.14s, box-shadow 0.14s, opacity 0.14s !important; }
        button:not(:disabled):hover { filter: brightness(1.10); transform: translateY(-1px); }
        button:not(:disabled):active { transform: translateY(0px) scale(0.97); filter: brightness(0.96); }

        /* ── Inputs ── */
        select option { background:#fff; color:#18130e; }
        ::placeholder { color:#b0a088; }
        input, select { transition: border-color 0.15s, box-shadow 0.15s; }
        input:focus, select:focus {
          outline: none !important;
          border-color: #1e5c38 !important;
          box-shadow: 0 0 0 3px #1e5c3822 !important;
        }

        /* ── Animations ── */
        @keyframes slideIn      { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideUp      { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn       { from{opacity:0} to{opacity:1} }
        @keyframes pulse        { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes popIn        { 0%{transform:scale(0.82);opacity:0} 65%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
        @keyframes breathe      { 0%,100%{box-shadow:0 0 0 0 rgba(30,92,56,0)} 50%{box-shadow:0 0 0 7px rgba(30,92,56,0.16)} }
        @keyframes breatheAmber { 0%,100%{box-shadow:0 0 0 0 rgba(160,108,8,0)} 50%{box-shadow:0 0 0 6px rgba(160,108,8,0.20)} }
        @keyframes bankPulse    { 0%,100%{box-shadow:0 2px 10px rgba(160,108,8,0.4);transform:scale(1)} 50%{box-shadow:0 2px 18px rgba(160,108,8,0.7);transform:scale(1.04)} }
        @keyframes toastBar     { from{width:100%} to{width:0%} }
        @keyframes ledPulse     { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes shimmer      { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes shimmerBar   {
          0%  { background-position: -200% 0; }
          100%{ background-position:  200% 0; }
        }
        @keyframes saveFlash    { 0%{opacity:0;transform:scale(0.8)} 20%{opacity:1;transform:scale(1.1)} 80%{opacity:1} 100%{opacity:0;transform:scale(0.95)} }
        @keyframes countUp      { from{transform:translateY(6px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes glow         { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes tabSlide     { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        /* ── Tab content entry ── */
        .tab-content { animation: tabSlide 0.22s ease both; }

        /* ── XP bar shimmer ── */
        .xpbar-shimmer::after {
          content:'';
          position:absolute;
          inset:0;
          background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.35) 50%,transparent 100%);
          background-size:200% 100%;
          animation: shimmerBar 2.4s ease-in-out infinite;
          border-radius:99px;
        }
        .xpbar-shimmer { position:relative; overflow:hidden; }

        /* ── Accent strip card ── */
        .card-strip { position:relative; overflow:hidden; }
        .card-strip::before {
          content:'';
          position:absolute;
          left:0;top:0;bottom:0;
          width:4px;
          border-radius:2px 0 0 2px;
        }

        /* ── Navigation tab bar ── */
        .nav-tab-active {
          background: linear-gradient(135deg, #1e5c3814, #1e5c3808) !important;
          color: #1e5c38 !important;
          border-bottom: 2.5px solid #1e5c38 !important;
          font-weight: 700 !important;
        }
        .nav-tab {
          transition: color 0.15s, background 0.15s, border-color 0.15s;
        }
        .nav-tab:hover:not(.nav-tab-active) {
          background: rgba(30,92,56,0.05) !important;
          color: #1e5c38 !important;
        }

        /* ── Mobile ── */
        :root {
          --gap: 16px;
          --pad: 22px;
          --card-radius: 16px;
          --font-base: 13px;
        }
        @media (max-width: 639px) {
          :root { --gap: 10px; --pad: 12px; --card-radius: 12px; --font-base: 12px; }
          .desktop-nav { display: none !important; }
          .mobile-nav  { display: flex !important; }
          .content-area { padding: 12px var(--pad) 60px !important; }
          .badge-alert { font-size: 8px !important; width: 14px !important; height: 14px !important; }
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
          /* Compact header on mobile */
          .header-title { font-size: 13px !important; }
          .header-line2 { gap: 6px !important; padding: 4px 10px 6px !important; }
          /* Full-width tables on mobile */
          .resp-grid { grid-template-columns: 1fr !important; }
          .resp-grid-2 { grid-template-columns: 1fr 1fr !important; }
          /* Modals full-screen on mobile */
          .modal-inner { border-radius: 0 !important; max-height: 100vh !important; height: 100vh !important; }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          :root { --gap: 12px; --pad: 16px; --card-radius: 14px; }
          .desktop-nav { display: flex !important; }
          .mobile-nav  { display: none !important; }
          .content-area { padding: 16px var(--pad) 60px !important; }
          .hide-tablet { display: none !important; }
          .resp-grid { grid-template-columns: 1fr 1fr !important; }
          .resp-grid-3 { grid-template-columns: 1fr 1fr !important; }
        }
        @media (min-width: 1024px) {
          .desktop-nav { display: flex !important; }
          .mobile-nav  { display: none !important; }
          .content-area { padding: 20px var(--pad) 60px !important; }
          .show-mobile { display: none !important; }
        }
      `;
