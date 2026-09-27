/**
 * useWeeklyReport — Export du rapport hebdomadaire.
 * - Markdown : téléchargement d'un fichier .md ou copie dans le presse-papiers
 * - PDF : affiche la version imprimable puis ouvre l'impression du navigateur
 */
import { useCallback, useEffect, useState } from 'react';
import { buildWeeklyReport, toMarkdown } from '../utils/report';
import { todayISO } from '../utils/dates';
import { downloadFile } from '../services/storage';

export function useWeeklyReport(data, scope, showToast) {
  // Rapport figé au moment de l'impression (null hors impression)
  const [printReport, setPrintReport] = useState(null);

  const markdown = useCallback(() => toMarkdown(buildWeeklyReport(data, { scope })), [data, scope]);

  const downloadMarkdown = useCallback(() => {
    downloadFile(markdown(), `rapport-theraply-${todayISO()}.md`, 'text/markdown;charset=utf-8');
    showToast('Rapport Markdown téléchargé');
  }, [markdown, showToast]);

  const copyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown());
      showToast('Rapport copié dans le presse-papiers');
    } catch {
      showToast('Copie impossible : utilisez le téléchargement', 'error');
    }
  }, [markdown, showToast]);

  const print = useCallback(() => setPrintReport(buildWeeklyReport(data, { scope })), [data, scope]);

  // Une fois la version imprimable affichée, on ouvre l'impression puis on la retire
  useEffect(() => {
    if (!printReport) return undefined;
    const done = () => setPrintReport(null);
    window.addEventListener('afterprint', done);
    const timer = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', done);
    };
  }, [printReport]);

  return { printReport, downloadMarkdown, copyMarkdown, print };
}
