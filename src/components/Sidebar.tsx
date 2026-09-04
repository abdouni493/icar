import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LogOut, X, LayoutDashboard, CalendarDays, ShoppingCart, ScrollText,
  ShieldCheck, Car, Wrench, Users, Factory, Building2, UsersRound,
  Palette, Receipt, Globe, Coins, FileBarChart2, Settings,
} from 'lucide-react';
import { SIDEBAR_ITEMS } from '../constants';
import { Language } from '../types';
import { DatabaseService } from '../services/DatabaseService';
import { usePermissions } from '../utils/permissions';

interface SidebarProps {
  lang: Language;
  isVisible: boolean;
  setIsVisible: (val: boolean) => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  alertsCount?: number;
  webOrdersCount?: number;
}

/** Icône Lucide associée à chaque onglet (l'emoji reste la source pour l'écran des permissions). */
const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  dashboard: LayoutDashboard,
  planner: CalendarDays,
  'web-orders': ShoppingCart,
  reservations: ScrollText,
  'protection-services': ShieldCheck,
  vehicles: Car,
  maintenance: Wrench,
  clients: Users,
  entreprises: Factory,
  agencies: Building2,
  team: UsersRound,
  personalization: Palette,
  expenses: Receipt,
  'web-mgmt': Globe,
  'car-gains': Coins,
  reports: FileBarChart2,
  config: Settings,
};

/** Regroupement des onglets en sections lisibles. */
const SECTIONS: { label: { fr: string; ar: string }; ids: string[] }[] = [
  { label: { fr: 'Pilotage', ar: 'القيادة' }, ids: ['dashboard', 'planner', 'web-orders'] },
  { label: { fr: 'Contrats', ar: 'العقود' }, ids: ['reservations', 'protection-services'] },
  { label: { fr: 'Flotte', ar: 'الأسطول' }, ids: ['vehicles', 'maintenance'] },
  { label: { fr: 'Répertoire', ar: 'الدليل' }, ids: ['clients', 'entreprises', 'agencies'] },
  { label: { fr: 'Équipe', ar: 'الفريق' }, ids: ['team'] },
  { label: { fr: 'Finances', ar: 'المالية' }, ids: ['expenses', 'car-gains', 'reports'] },
  { label: { fr: 'Site & réglages', ar: 'الموقع والإعدادات' }, ids: ['web-mgmt', 'personalization', 'config'] },
];

export const Sidebar: React.FC<SidebarProps> = ({
  lang, isVisible, setIsVisible, onLogout, activeTab, setActiveTab, alertsCount = 0, webOrdersCount = 0
}) => {
  const isRtl = lang === 'ar';
  // Un employé ne voit que les interfaces autorisées par l'admin.
  const { canSeeInterface } = usePermissions();
  const byId = Object.fromEntries(SIDEBAR_ITEMS.map(i => [i.id, i]));
  const [agencyData, setAgencyData] = useState({ name: 'MHD AUTO', logo: '' });

  useEffect(() => {
    const loadAgencyData = async () => {
      try {
        const websiteSettings = await DatabaseService.getWebsiteSettings();
        setAgencyData({
          name: websiteSettings.name || 'MHD AUTO',
          logo: websiteSettings.logo || '',
        });
      } catch (error) {
        console.error('Error loading agency data:', error);
        setAgencyData({ name: 'MHD AUTO', logo: '' });
      }
    };
    loadAgencyData();
  }, []);

  // N'affiche que les sections comportant au moins un onglet autorisé.
  const visibleSections = SECTIONS
    .map(section => ({ ...section, ids: section.ids.filter(id => byId[id] && canSeeInterface(id)) }))
    .filter(section => section.ids.length > 0);

  let renderIndex = 0;

  const renderItem = (id: string) => {
    const item = byId[id];
    if (!item) return null;
    const Icon = ICONS[id] || LayoutDashboard;
    const isActive = activeTab === id;
    const i = renderIndex++;

    return (
      <motion.button
        key={id}
        initial={{ opacity: 0, x: isRtl ? 12 : -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.02 * i, duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        onClick={() => {
          setActiveTab(id);
          if (window.innerWidth < 1024) setIsVisible(false);
        }}
        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group relative cursor-pointer
          ${isActive
            ? 'bg-saas-primary-via/12 text-saas-text-main shadow-sm border border-saas-primary-via/35'
            : 'text-saas-text-muted hover:bg-saas-bg hover:text-saas-text-main border border-transparent'}`}
      >
        {/* Liseré actif doré */}
        {isActive && (
          <motion.span
            layoutId="sidebar-active-bar"
            className="absolute ltr:left-0 rtl:right-0 top-2 bottom-2 w-1 rounded-full bg-linear-to-b from-[#E4C878] to-[#B8912E]"
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          />
        )}
        <span className={`shrink-0 transition-all duration-300 ${isActive ? 'text-saas-primary-via scale-110' : 'group-hover:scale-110 group-hover:text-saas-primary-via'}`}>
          <Icon size={19} />
        </span>
        <span className="text-[13px] font-bold tracking-wide">
          {item.label[lang]}
        </span>

        {/* Compteur d'alertes de maintenance */}
        {id === 'dashboard' && alertsCount > 0 && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
            title={lang === 'fr' ? `${alertsCount} alerte(s) de maintenance` : `${alertsCount} تنبيه صيانة`}>
            <motion.span className="absolute inline-flex h-6 w-6 rounded-full bg-red-500/40"
              animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="relative min-w-[22px] h-[22px] px-1.5 flex items-center justify-center bg-gradient-to-br from-red-500 to-orange-500 text-white text-[11px] font-black rounded-full shadow-lg shadow-red-500/50 ring-2 ring-white">
              {alertsCount > 99 ? '99+' : alertsCount}
            </motion.span>
          </span>
        )}

        {/* Compteur des nouvelles commandes du site */}
        {id === 'web-orders' && webOrdersCount > 0 && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
            title={lang === 'fr' ? 'Nouvelles commandes du site en attente' : 'طلبات جديدة من الموقع في الانتظار'}>
            <motion.span className="absolute inline-flex h-6 w-6 rounded-full bg-[#C8A13C]/40"
              animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="relative min-w-[22px] h-[22px] px-1.5 flex items-center justify-center bg-gradient-to-br from-[#E4C878] to-[#B8912E] text-[#14130E] text-[11px] font-black rounded-full shadow-lg shadow-[#C8A13C]/40 ring-2 ring-white">
              {webOrdersCount > 99 ? '99+' : webOrdersCount}
            </motion.span>
          </span>
        )}
      </motion.button>
    );
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          initial={{ x: isRtl ? '100%' : '-100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: isRtl ? '100%' : '-100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 left-0 z-50 w-[86vw] max-w-72 bg-saas-surface text-saas-text-main flex flex-col shadow-xl ltr:left-0 rtl:right-0 border-r border-saas-border overflow-y-auto lg:static lg:w-72 lg:h-screen lg:sticky lg:top-0 lg:shadow-none"
          style={{ [isRtl ? 'right' : 'left']: 0 }}
        >
          <div className="p-5 lg:p-6 flex items-center justify-between border-b border-saas-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-saas-primary-via/40 shadow-md shadow-saas-primary-start/20 flex items-center justify-center flex-shrink-0">
                {agencyData.logo ? (
                  <img src={agencyData.logo} alt="Agency Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-[#14130E] font-black text-xl italic bg-linear-to-br from-[#E4C878] to-[#B8912E] w-full h-full flex items-center justify-center">
                    {(agencyData.name || 'M').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-xl font-black tracking-tight uppercase">
                {agencyData.name.split(' ').slice(0, 3).join(' ').split(' ')[0]}
                <span className="text-saas-primary-via">{agencyData.name.split(' ').slice(0, 3).join(' ').split(' ').slice(1).join(' ')}</span>
              </span>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="p-2 rounded-lg hover:bg-saas-bg text-saas-text-muted transition-colors lg:hidden cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-4 custom-scrollbar">
            {visibleSections.map(section => (
              <div key={section.label.fr} className="space-y-1">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-saas-text-muted/70">
                  {section.label[lang]}
                </p>
                {section.ids.map(id => renderItem(id))}
              </div>
            ))}
          </nav>

          <div className="p-5 border-t border-saas-border bg-saas-bg/50">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-saas-danger-start hover:bg-saas-danger-start/10 transition-all font-bold uppercase tracking-wider text-xs border border-transparent hover:border-saas-danger-start/25 cursor-pointer"
            >
              <LogOut size={18} />
              <span>{lang === 'fr' ? 'Déconnexion' : 'تسجيل الخروج'}</span>
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
