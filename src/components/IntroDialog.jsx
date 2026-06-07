import { useLang } from "../i18n/index.jsx";
import { DialogScene } from "./dialog/DialogScene.jsx";
import {
  INTRO_DIALOG, TABLES_DIALOG, SERVERS_DIALOG, BANK_DIALOG, STATS_DIALOG,
  OBJECTIVES_DIALOG, STOCK_DIALOG, MENU_DIALOG, KITCHEN_DIALOG,
  INTRO_DIALOG_EN, TABLES_DIALOG_EN, SERVERS_DIALOG_EN, BANK_DIALOG_EN, STATS_DIALOG_EN,
  OBJECTIVES_DIALOG_EN, STOCK_DIALOG_EN, MENU_DIALOG_EN, KITCHEN_DIALOG_EN,
} from "../constants/dialogData.js";

function useDialogData(frData, enData) {
  const { lang } = useLang();
  return lang === "en" ? enData : frData;
}

export function IntroDialog({ onDone }) {
  const { t } = useLang();
  const data = useDialogData(INTRO_DIALOG, INTRO_DIALOG_EN);
  return <DialogScene dialogData={data} ctaLabel={t("intro.cta")} onDone={onDone}/>;
}

export function TablesDialog({ onDone }) {
  const { t } = useLang();
  const data = useDialogData(TABLES_DIALOG, TABLES_DIALOG_EN);
  return <DialogScene dialogData={data} ctaLabel={t("tablesTutorial.cta")} onDone={onDone}/>;
}

export function ServersDialog({ onDone }) {
  const { t } = useLang();
  const data = useDialogData(SERVERS_DIALOG, SERVERS_DIALOG_EN);
  return <DialogScene dialogData={data} ctaLabel={t("serversTutorial.cta")} onDone={onDone}/>;
}

export function BankDialog({ onDone }) {
  const { t } = useLang();
  const data = useDialogData(BANK_DIALOG, BANK_DIALOG_EN);
  return <DialogScene dialogData={data} ctaLabel={t("bankTutorial.cta")} onDone={onDone}/>;
}

export function StatsDialog({ onDone }) {
  const { t } = useLang();
  const data = useDialogData(STATS_DIALOG, STATS_DIALOG_EN);
  return <DialogScene dialogData={data} ctaLabel={t("statsTutorial.cta")} onDone={onDone}/>;
}

export function ObjectivesDialog({ onDone }) {
  const { t } = useLang();
  const data = useDialogData(OBJECTIVES_DIALOG, OBJECTIVES_DIALOG_EN);
  return <DialogScene dialogData={data} ctaLabel={t("objectivesTutorial.cta")} onDone={onDone}/>;
}

export function StockDialog({ onDone }) {
  const { t } = useLang();
  const data = useDialogData(STOCK_DIALOG, STOCK_DIALOG_EN);
  return <DialogScene dialogData={data} ctaLabel={t("stockTutorial.cta")} onDone={onDone}/>;
}

export function MenuDialog({ onDone }) {
  const { t } = useLang();
  const data = useDialogData(MENU_DIALOG, MENU_DIALOG_EN);
  return <DialogScene dialogData={data} ctaLabel={t("menuTutorial.cta")} onDone={onDone}/>;
}

export function KitchenDialog({ onDone }) {
  const { t } = useLang();
  const data = useDialogData(KITCHEN_DIALOG, KITCHEN_DIALOG_EN);
  return <DialogScene dialogData={data} ctaLabel={t("kitchenTutorial.cta")} onDone={onDone}/>;
}
