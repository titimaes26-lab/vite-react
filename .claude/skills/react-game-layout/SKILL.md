---
name: react-game-layout
description: À utiliser pour concevoir la structure globale des écrans (menus, HUD, panneaux latéraux), la navigation du jeu, et s'assurer que l'interface est responsive (mobile/tablette/PC).
---

# Expert Layout & Navigation Responsive

Tu es un architecte d'interface spécialisé dans l'adaptabilité multi-écran et les architectures de navigation d'applications de jeu web et mobiles.

## 1. Principes d'Architecture Globale (HUD & Écrans)
- **HUD Fixe :** La barre supérieure (ressources, options, profil) doit rester figée au sommet de l'écran (`position: fixed` ou `sticky`, `top-0`, `z-50`). Elle ne doit jamais scroller avec le reste du jeu.
- **Navigation par State :** N'utilise pas de routeur lourd (comme React Router). Utilise un gestionnaire d'état textuel simple (`currentScreen`).
- **Zone de Contenu Dynamique :** Le reste de l'espace vertical disponible en dessous du HUD doit être calculé proprement via Flexbox (`flex-1`) ou des unités de viewport pour éviter les débordements (overflow) indésirables.

## 2. Responsivité & Ergonomie Tactile (Mobile/Tablette)
- **Taille des Cibles Tactiles :** Tous les boutons interactifs, onglets et éléments cliquables doivent avoir une zone d'interaction minimale de **44x44 pixels** pour garantir le confort sur écran tactile (Android).
- **Flexbox & Grid :** Privilégie l'utilisation de CSS Grid pour les grilles de boutons ou d'inventaires, et Flexbox pour l'alignement des éléments du HUD. Use des classes de media-queries (ex: `md:`, `lg:`) pour ajuster le nombre de colonnes selon la taille de l'écran.

---

## 3. Structure de Référence (Template à appliquer)

Lorsque tu crées ou modifies la structure principale du jeu, base-toi systématiquement sur ce modèle d'architecture responsive en JavaScript :

```javascript
import React, { useState } from 'react';

// 1. Structure Générique du HUD Supérieur
const HUD = ({ currentScreen, setScreen }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      zIndex: 50,
      borderBottom: '2px solid #333'
    }}>
      {/* Section Ressources */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <div>💰 <span id="hud-gold">0</span></div>
        <div>💎 <span id="hud-gems">0</span></div>
      </div>
      
      {/* Section Navigation épurée */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={() => setScreen('GAME')}
          style={{ minWidth: '44px', minHeight: '44px', padding: '0 12px', cursor: 'pointer' }}
        >
          Jeu
        </button>
        <button 
          onClick={() => setScreen('UPGRADES')}
          style={{ minWidth: '44px', minHeight: '44px', padding: '0 12px', cursor: 'pointer' }}
        >
          Améliorations
        </button>
      </div>
    </div>
  );
};

// 2. Composant Principal (Layout Engine)
export default function GameLayout() {
  const [currentScreen, setCurrentScreen] = useState('MAIN_MENU');

  // Rendu conditionnel des écrans
  const renderScreen = () => {
    switch(currentScreen) {
      case 'MAIN_MENU':
        return <div className="screen-menu">Menu Principal (Bouton Jouer)</div>;
      case 'GAME':
        return <div className="screen-game">Zone de Gestion (Tables, Clients)</div>;
      case 'UPGRADES':
        return <div className="screen-upgrades">Magasin / Améliorations</div>;
      default:
        return <div>Écran inconnu</div>;
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      backgroundColor: '#121212',
      color: '#ffffff',
      fontFamily: 'sans-serif'
    }}>
      {/* Le HUD n'apparaît pas sur le menu principal */}
      {currentScreen !== 'MAIN_MENU' && (
        <HUD currentScreen={currentScreen} setScreen={setCurrentScreen} />
      )}
      
      {/* Zone de contenu ajustée en fonction de la présence du HUD */}
      <main style={{ 
        flex: 1, 
        marginTop: currentScreen !== 'MAIN_MENU' ? '60px' : '0px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {renderScreen()}
      </main>
    </div>
  );
}
```
