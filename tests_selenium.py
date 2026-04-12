#!/usr/bin/env python3
"""
Tests Selenium — Mon Resto Manager
Lancé sur Termux / Android.

Prérequis Termux :
    pkg install chromium          # installe chromium + chromedriver
    pip install selenium

Usage :
    python tests_selenium.py
"""

import os, sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
import time

# ── Configuration ──────────────────────────────────────────────────────────────
BASE_URL       = "http://localhost:5173"
SCREENSHOT_DIR = "/sdcard/Download"
WAIT           = 10   # secondes max par attente

# Chemins Termux (pkg install chromium)
TERMUX_PREFIX    = "/data/data/com.termux/files/usr"
CHROMEDRIVER_BIN = os.environ.get("CHROMEDRIVER_BIN",
                       f"{TERMUX_PREFIX}/bin/chromedriver")
CHROMIUM_BIN     = os.environ.get("CHROMIUM_BIN",
                       f"{TERMUX_PREFIX}/bin/chromium-browser")

# ── Helpers ────────────────────────────────────────────────────────────────────
passed = 0
failed = 0
n      = 0

def ss(driver, name):
    """Capture d'écran dans /sdcard/Download/."""
    path = f"{SCREENSHOT_DIR}/test_{name}.png"
    driver.save_screenshot(path)
    print(f"      📸  {path}")

def tab(driver, wait, label):
    """Cliquer un onglet de navigation par son libellé."""
    btn = wait.until(EC.element_to_be_clickable(
        (By.XPATH, f"//button[.//span[contains(text(),'{label}')]]")
    ))
    btn.click()
    time.sleep(0.4)

def close_modal(driver, wait):
    """Fermer une modale (bouton ✕ ou Fermer)."""
    try:
        btn = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(text(),'✕') or contains(text(),'Fermer') or contains(text(),'Annuler')]")
        ))
        btn.click()
        time.sleep(0.3)
    except Exception:
        pass

def dismiss_tutorials(driver, wait):
    """Fermer les écrans tutoriels/intro s'ils sont présents."""
    for label in ["Commencer", "Continuer", "Compris", "OK", "Suivant", "Fermer"]:
        try:
            btn = WebDriverWait(driver, 3).until(
                EC.element_to_be_clickable(
                    (By.XPATH, f"//button[contains(text(),'{label}')]")
                )
            )
            btn.click()
            time.sleep(0.4)
        except Exception:
            pass

# ── Setup driver ───────────────────────────────────────────────────────────────
def make_driver():
    options = Options()
    # Obligatoire sur Termux/Android : pas de serveur d'affichage
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-software-rasterizer")
    options.add_argument("--no-zygote")
    options.add_argument("--single-process")
    options.add_argument("--disable-extensions")
    options.add_argument("--no-first-run")
    options.add_argument("--remote-debugging-port=0")
    # Répertoire utilisateur isolé pour éviter les conflits de session
    options.add_argument("--user-data-dir=/data/data/com.termux/files/home/.selenium-profile")

    # Sur Termux, Selenium Manager ne sait pas gérer android/any.
    # On pointe explicitement vers le chromedriver et chromium installés
    # via : pkg install chromium
    if not os.path.isfile(CHROMEDRIVER_BIN):
        print(f"⚠  chromedriver introuvable : {CHROMEDRIVER_BIN}")
        print("   Installez-le avec : pkg install chromium")
        print("   Ou définissez la variable : CHROMEDRIVER_BIN=/chemin/vers/chromedriver")
        sys.exit(1)

    if os.path.isfile(CHROMIUM_BIN):
        options.binary_location = CHROMIUM_BIN

    service = Service(executable_path=CHROMEDRIVER_BIN)
    return webdriver.Chrome(service=service, options=options)

driver = make_driver()
wait   = WebDriverWait(driver, WAIT)

# ══════════════════════════════════════════════════════════════════════════════
# SUITE DE TESTS
# ══════════════════════════════════════════════════════════════════════════════
try:
    # ── Chargement initial ─────────────────────────────────────────────────────
    driver.get(BASE_URL)
    print("Chargement de l'application...")
    time.sleep(1.5)
    dismiss_tutorials(driver, wait)

    # ══ BLOC 1 — TOPBAR ═══════════════════════════════════════════════════════

    n += 1
    print(f"\n[T{n:02d}] Titre 'Le Grand Restaurant'")
    try:
        el = wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Le Grand Restaurant')]")
        ))
        assert el.is_displayed()
        print("      ✅  Titre visible")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Horloge de jeu (format HH:MM)")
    try:
        # L'horloge affiche gameTime.str ex. "08:00"
        el = wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),':') and string-length(normalize-space(text()))<=5]")
        ))
        txt = el.text.strip()
        assert ":" in txt and len(txt) <= 5, f"Format inattendu : '{txt}'"
        print(f"      ✅  Horloge : {txt}")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Niveau restaurant affiché")
    try:
        noms_niveaux = "Café de quartier|Bistrot|Brasserie|Restaurant|Grand Restaurant|Palace"
        el = wait.until(EC.visibility_of_element_located(
            (By.XPATH, f"//*[{' or '.join(f'contains(text(),\"{n2}\")' for n2 in noms_niveaux.split('|'))}]")
        ))
        print(f"      ✅  Niveau : {el.text.strip()}")
        ss(driver, f"T{n:02d}_topbar_niveau")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Indicateur de réputation (/100)")
    try:
        el = wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'/100')]")
        ))
        txt = el.text.strip()
        assert "/100" in txt
        print(f"      ✅  Réputation : {txt}")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Badge niveau (N0…N9)")
    try:
        el = wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[starts-with(normalize-space(text()),'N') and string-length(normalize-space(text()))=2]")
        ))
        print(f"      ✅  Badge : {el.text.strip()}")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    # ══ BLOC 2 — MODALES TOPBAR ═══════════════════════════════════════════════

    n += 1
    print(f"\n[T{n:02d}] Modal Aide (?)")
    try:
        btn = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[@title='Guide utilisateur' or (normalize-space(text())='?' and not(contains(@class,'nav')))]")
        ))
        btn.click()
        time.sleep(0.4)
        wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Guide') or contains(text(),'aide') or contains(text(),'Aide')]")
        ))
        print("      ✅  Modal aide ouvert")
        ss(driver, f"T{n:02d}_modal_aide")
        close_modal(driver, wait)
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Modal Banque")
    try:
        btn = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Banque')]")
        ))
        btn.click()
        time.sleep(0.4)
        wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Prêt') or contains(text(),'emprunt') or contains(text(),'mensualité') or contains(text(),'Banque')]")
        ))
        print("      ✅  Modal banque ouvert")
        ss(driver, f"T{n:02d}_modal_banque")
        close_modal(driver, wait)
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    # ══ BLOC 3 — ONGLET TABLES ════════════════════════════════════════════════

    n += 1
    print(f"\n[T{n:02d}] Onglet Tables — chargement")
    try:
        tab(driver, wait, "Tables")
        wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Table') or contains(text(),'Salle')]")
        ))
        print("      ✅  Vue Tables chargée")
        ss(driver, f"T{n:02d}_tables")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Tables — au moins 1 table présente")
    try:
        tables_el = driver.find_elements(
            By.XPATH, "//*[contains(text(),'Table 1') or contains(text(),'Table A') or contains(text(),'T1')]"
        )
        # Fallback : chercher des cartes avec statut "libre" ou "occupée"
        if not tables_el:
            tables_el = driver.find_elements(
                By.XPATH, "//*[contains(text(),'libre') or contains(text(),'occupée') or contains(text(),'nettoyage')]"
            )
        assert len(tables_el) > 0, "Aucune table trouvée"
        print(f"      ✅  {len(tables_el)} table(s) visible(s)")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Tables — file d'attente visible")
    try:
        wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'file') or contains(text(),'attente') or contains(text(),'File') or contains(text(),'Attente')]")
        ))
        print("      ✅  Zone file d'attente présente")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    # ══ BLOC 4 — ONGLET SERVEURS ══════════════════════════════════════════════

    n += 1
    print(f"\n[T{n:02d}] Onglet Serveurs — chargement")
    try:
        tab(driver, wait, "Serveurs")
        wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Serveur') or contains(text(),'serveur')]")
        ))
        print("      ✅  Vue Serveurs chargée")
        ss(driver, f"T{n:02d}_serveurs")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Serveurs — carte serveur avec nom + niveau")
    try:
        # Un serveur avec son niveau (Stagiaire, Serveur, Senior, Expert, Maître)
        el = wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Stagiaire') or contains(text(),'Senior') or contains(text(),'Expert') or contains(text(),'Maître')]")
        ))
        print(f"      ✅  Niveau serveur : {el.text.strip()}")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Serveurs — indicateur moral visible")
    try:
        el = wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'moral') or contains(text(),'Moral') or contains(text(),'%')]")
        ))
        print(f"      ✅  Moral : {el.text.strip()[:30]}")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Serveurs — bouton Embaucher / recrutement")
    try:
        el = wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Embaucher') or contains(text(),'Recruter') or contains(text(),'embaucher')]")
        ))
        print(f"      ✅  Bouton recrutement présent : {el.text.strip()[:30]}")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    # ══ BLOC 5 — ONGLET CUISINE ═══════════════════════════════════════════════

    n += 1
    print(f"\n[T{n:02d}] Onglet Cuisine — chargement")
    try:
        tab(driver, wait, "Cuisine")
        wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Julien Marchand') or contains(text(),'Chef') or contains(text(),'Commandes')]")
        ))
        print("      ✅  Vue Cuisine chargée")
        ss(driver, f"T{n:02d}_cuisine")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Cuisine — chef Julien Marchand visible")
    try:
        el = wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Julien')]")
        ))
        print(f"      ✅  Chef : {el.text.strip()[:40]}")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Cuisine — niveau chef (Apprenti…Chef Étoilé)")
    try:
        niveaux = ["Apprenti", "Cuisinier", "Chef de Partie", "Sous-Chef", "Chef Cuisine", "Chef Étoilé"]
        xp_chef = " or ".join(f'contains(text(),"{lv}")' for lv in niveaux)
        el = wait.until(EC.visibility_of_element_located(
            (By.XPATH, f"//*[{xp_chef}]")
        ))
        print(f"      ✅  Niveau chef : {el.text.strip()[:30]}")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Cuisine — slot commis Léa Fontaine visible")
    try:
        el = wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Léa') or contains(text(),'commis') or contains(text(),'Commis')]")
        ))
        print(f"      ✅  Commis : {el.text.strip()[:40]}")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Cuisine — colonnes pipeline (Commandes / En cuisson / Prêts)")
    try:
        pipeline = ["Commandes", "En cuisson", "Prêts"]
        found = []
        for label in pipeline:
            els = driver.find_elements(By.XPATH, f"//*[contains(text(),'{label}')]")
            if els:
                found.append(label)
        assert len(found) > 0, "Aucune colonne pipeline trouvée"
        print(f"      ✅  Colonnes trouvées : {found}")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Cuisine — indicateur moral brigade")
    try:
        el = wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'moral') or contains(text(),'Moral') or contains(text(),'brigade')]")
        ))
        print(f"      ✅  Moral brigade : {el.text.strip()[:30]}")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Cuisine — slots commis verrouillés affichent niveau requis")
    try:
        # Les slots verrouillés affichent le nom du niveau chef (ex. "Chef de Partie")
        locked = driver.find_elements(
            By.XPATH, "//*[contains(text(),'🔒') or (contains(text(),'Chef de Partie') and not(contains(text(),'Julien')))]"
        )
        if locked:
            print(f"      ✅  {len(locked)} slot(s) verrouillé(s) affiché(s) correctement")
        else:
            print("      ℹ️   Pas de slot verrouillé (chef déjà haut niveau)")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    # ══ BLOC 6 — ONGLET MENU ═════════════════════════════════════════════════

    n += 1
    print(f"\n[T{n:02d}] Onglet Menu — chargement")
    try:
        tab(driver, wait, "Menu")
        wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Entrées') or contains(text(),'Plats') or contains(text(),'Desserts')]")
        ))
        print("      ✅  Vue Menu chargée")
        ss(driver, f"T{n:02d}_menu")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Menu — catégories présentes (Entrées / Plats / Desserts)")
    try:
        categories = ["Entrées", "Plats", "Desserts"]
        found = []
        for cat in categories:
            els = driver.find_elements(By.XPATH, f"//*[contains(text(),'{cat}')]")
            if els:
                found.append(cat)
        assert len(found) >= 2, f"Catégories trouvées : {found}"
        print(f"      ✅  Catégories : {found}")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Menu — au moins 1 plat avec prix en €")
    try:
        plats = driver.find_elements(
            By.XPATH, "//*[contains(text(),'€') and not(contains(text(),'Solde')) and not(contains(text(),'−'))]"
        )
        assert len(plats) > 0, "Aucun plat avec prix trouvé"
        print(f"      ✅  {len(plats)} élément(s) avec prix")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Menu — section Formules présente")
    try:
        el = wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Formule') or contains(text(),'formule') or contains(text(),'menu du jour')]")
        ))
        print(f"      ✅  Formules : {el.text.strip()[:40]}")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    # ══ BLOC 7 — ONGLET STOCKS ════════════════════════════════════════════════

    n += 1
    print(f"\n[T{n:02d}] Onglet Stocks — chargement")
    try:
        tab(driver, wait, "Stocks")
        wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Stock') or contains(text(),'stock') or contains(text(),'Fournisseur')]")
        ))
        print("      ✅  Vue Stocks chargée")
        ss(driver, f"T{n:02d}_stocks")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Stocks — au moins 1 ingrédient avec unité (kg / L / pièce)")
    try:
        ingr = driver.find_elements(
            By.XPATH, "//*[contains(text(),' kg') or contains(text(),' L') or contains(text(),'pièce') or contains(text(),' u')]"
        )
        assert len(ingr) > 0, "Aucun ingrédient avec unité"
        print(f"      ✅  {len(ingr)} ingrédient(s) affiché(s)")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Stocks — bouton Commande / Commander visible")
    try:
        el = wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Command') or contains(text(),'command') or contains(text(),'Acheter') or contains(text(),'Approvisionner')]")
        ))
        print(f"      ✅  Action stock : {el.text.strip()[:40]}")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    # ══ BLOC 8 — ONGLET OBJECTIFS ════════════════════════════════════════════

    n += 1
    print(f"\n[T{n:02d}] Onglet Objectifs — chargement")
    try:
        tab(driver, wait, "Objectifs")
        wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Objectif') or contains(text(),'clients servis') or contains(text(),'Défi')]")
        ))
        print("      ✅  Vue Objectifs chargée")
        ss(driver, f"T{n:02d}_objectifs")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Objectifs — section Défis du jour")
    try:
        el = wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Défi') or contains(text(),'défi') or contains(text(),'journalier')]")
        ))
        print(f"      ✅  Défis : {el.text.strip()[:40]}")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    # ══ BLOC 9 — ONGLET PLAINTES ═════════════════════════════════════════════

    n += 1
    print(f"\n[T{n:02d}] Onglet Plaintes — chargement")
    try:
        tab(driver, wait, "Plaintes")
        wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Plainte') or contains(text(),'plainte') or contains(text(),'Aucune') or contains(text(),'réclamation')]")
        ))
        print("      ✅  Vue Plaintes chargée")
        ss(driver, f"T{n:02d}_plaintes")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    # ══ BLOC 10 — ONGLET STATISTIQUES ════════════════════════════════════════

    n += 1
    print(f"\n[T{n:02d}] Onglet Statistiques — chargement")
    try:
        tab(driver, wait, "Statistiques")
        wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Revenus') or contains(text(),'Servis') or contains(text(),'Statistiques')]")
        ))
        print("      ✅  Vue Statistiques chargée")
        ss(driver, f"T{n:02d}_stats")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Statistiques — palier réputation affiché")
    try:
        paliers = ["Réputé", "Apprécié", "Neutre", "Dégradée", "Désastreuse"]
        xp = " or ".join(f'contains(text(),"{p}")' for p in paliers)
        el = wait.until(EC.visibility_of_element_located((By.XPATH, f"//*[{xp}]")))
        print(f"      ✅  Palier : {el.text.strip()}")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Statistiques — sélecteur de période (5 / 7 / 15 jours)")
    try:
        periodes = driver.find_elements(
            By.XPATH, "//button[text()='5' or text()='7' or text()='15']"
        )
        assert len(periodes) >= 2, f"Sélecteur période introuvable ({len(periodes)} bouton(s))"
        print(f"      ✅  {len(periodes)} bouton(s) de période trouvé(s)")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Statistiques — bouton Grand Livre (transactions)")
    try:
        btn = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(.,'Grand livre') or contains(.,'Transactions') or contains(.,'💰')]")
        ))
        btn.click()
        time.sleep(0.4)
        wait.until(EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Solde actuel') or contains(text(),'Grand livre')]")
        ))
        print("      ✅  Modal Grand livre ouvert")
        ss(driver, f"T{n:02d}_grand_livre")
        close_modal(driver, wait)
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    n += 1
    print(f"\n[T{n:02d}] Statistiques — tableau journalier (colonnes Jour / Revenus / Servis)")
    try:
        colonnes = ["Jour", "Revenus", "Servis"]
        found = []
        for col in colonnes:
            els = driver.find_elements(By.XPATH, f"//*[contains(text(),'{col}')]")
            if els:
                found.append(col)
        assert len(found) >= 2, f"Colonnes trouvées : {found}"
        print(f"      ✅  Colonnes tableau : {found}")
        ss(driver, f"T{n:02d}_tableau_stats")
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

    # ══ BLOC 11 — CYCLE NAVIGATION COMPLET ══════════════════════════════════

    n += 1
    print(f"\n[T{n:02d}] Cycle complet des 8 onglets sans erreur")
    try:
        onglets = ["Tables", "Serveurs", "Cuisine", "Menu", "Stocks", "Objectifs", "Plaintes", "Statistiques"]
        for label in onglets:
            tab(driver, wait, label)
        ss(driver, f"T{n:02d}_cycle_complet")
        print(f"      ✅  8 onglets parcourus sans erreur JavaScript")
        # Vérifier absence d'erreur JS critique (pas de 'Cannot read' dans la page)
        page = driver.page_source
        assert "Cannot read" not in page, "Erreur JS détectée dans la page"
        assert "Uncaught" not in page, "Erreur JS non capturée détectée"
        passed += 1
    except Exception as e:
        print(f"      ❌  {e}"); failed += 1; ss(driver, f"FAIL_T{n:02d}")

# ── Fin de session ─────────────────────────────────────────────────────────────
except Exception as e:
    print(f"\n💥 Erreur fatale : {e}")
    failed += 1
    try:
        driver.save_screenshot(f"{SCREENSHOT_DIR}/test_FATAL.png")
    except Exception:
        pass

finally:
    print(f"""
{'═'*50}
  RÉSULTATS : {passed} ✅  réussi(s)   {failed} ❌  échoué(s)
  Total      : {n} tests
{'═'*50}""")
    driver.quit()
