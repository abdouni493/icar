import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Printer, FileText, Globe } from 'lucide-react';
import { generateConditionsPrintHTML, getConditionsTemplate } from '../constants/ConditionsTemplates';

interface ConditionsPersonalizerProps {
  lang: 'fr' | 'ar';
  reservationId?: string;
  onClose: () => void;
  onSave?: (conditions: string) => void;
  agencyId?: string;
}

export const ConditionsPersonalizer: React.FC<ConditionsPersonalizerProps> = ({
  lang,
  reservationId,
  onClose,
  onSave,
  agencyId
}) => {
  const [conditionsLanguage, setConditionsLanguage] = useState<'ar' | 'fr'>('ar');
  const [isPrinting, setIsPrinting] = useState(false);
  const template = getConditionsTemplate(conditionsLanguage);
  const isArabic = conditionsLanguage === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  const textAlign = isArabic ? 'right' : 'left';

  const handlePrint = () => {
    setIsPrinting(true);
    const content = generateConditionsPrintHTML(conditionsLanguage);
    setTimeout(() => {
      const printWindow = window.open('', '', 'height=900,width=800');
      if (printWindow) {
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        setTimeout(() => setIsPrinting(false), 100);
      }
    }, 300);
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 24 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto sm:py-8"
      >
        <div
          style={{
            width: '100%',
            maxWidth: '1100px',
            maxHeight: '96vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0,30,100,0.35)',
            background: '#fff',
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              background: 'linear-gradient(135deg, #B8912E 0%, #B8912E 100%)',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  borderRadius: '10px',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <FileText size={22} color="#fff" />
              </div>
              <div>
                <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '20px', margin: 0 }}>
                  {isArabic ? 'شروط التأجير' : 'Conditions de Location'}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', margin: '3px 0 0' }}>
                  {template.subtitle}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Language selector */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  padding: '3px',
                  gap: '3px',
                }}
              >
                {(['fr', 'ar'] as const).map((lng) => (
                  <button
                    key={lng}
                    onClick={() => setConditionsLanguage(lng)}
                    style={{
                      padding: '5px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '13px',
                      transition: 'all 0.2s',
                      background: conditionsLanguage === lng ? '#fff' : 'transparent',
                      color: conditionsLanguage === lng ? '#B8912E' : 'rgba(255,255,255,0.85)',
                    }}
                  >
                    {lng === 'fr' ? '🇫🇷 FR' : '🇸🇦 AR'}
                  </button>
                ))}
              </div>

              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.28)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                <X size={20} color="#fff" />
              </button>
            </div>
          </div>

          {/* ── Document Preview Area ── */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              background: '#F3EEE1',
              padding: '28px 32px',
            }}
          >
            {/* A4 Document Card */}
            <div
              dir={dir}
              style={{
                background: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 32px rgba(0,30,100,0.18)',
                maxWidth: '100%',
                margin: '0 auto',
                padding: '44px 56px',
                fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
                position: 'relative',
                border: '2px solid #B8912E',
              }}
            >
              {/* Document Title */}
              <div
                style={{
                  textAlign: 'center',
                  borderBottom: '3px solid #B8912E',
                  paddingBottom: '14px',
                  marginBottom: '22px',
                }}
              >
                <h1
                  style={{
                    color: '#B8912E',
                    fontSize: '24px',
                    fontWeight: 800,
                    margin: '0 0 8px',
                    letterSpacing: '0.3px',
                  }}
                >
                  {template.title}
                </h1>
                <p style={{ color: '#555', fontSize: '14px', margin: 0, fontStyle: 'italic' }}>
                  {template.subtitle}
                </p>
              </div>

              {/* Conditions List — full-document style like the scanned images */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {template.conditions.map((condition, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '10px 0',
                      borderBottom: index < template.conditions.length - 1 ? '1px solid #F3EEE1' : 'none',
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: '14px',
                        color: '#222',
                        lineHeight: '1.7',
                        textAlign: textAlign as 'left' | 'right',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          color: '#B8912E',
                          marginInlineEnd: '6px',
                        }}
                      >
                        {index + 1}- {condition.title}
                      </span>
                      <span style={{ color: '#333' }}>{condition.content}</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Acceptance Statement */}
              <div
                style={{
                  marginTop: '20px',
                  padding: '10px 14px',
                  background: '#FBF7EA',
                  borderRadius: '6px',
                  border: '1px solid #ECD9A0',
                  textAlign: textAlign as 'left' | 'right',
                }}
              >
                <p style={{ fontSize: '13.5px', color: '#B8912E', fontWeight: 600, margin: 0 }}>
                  {isArabic
                    ? 'يُقرّ المستأجر بأنه اطّلع على شروط الإيجار هذه وقبولها دون أي تحفظ، ويتعهد بتوقيع هذا العقد.'
                    : "Le client déclare avoir pris connaissance et accepter sans réserve les présentes conditions de location et s'engage à signer ce contrat."}
                </p>
              </div>

              {/* Signatures */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '32px',
                  marginTop: '28px',
                  paddingTop: '18px',
                  borderTop: '2px solid #B8912E',
                }}
              >
                {[
                  { label: template.agencySignatureLabel, icon: '🏢' },
                  { label: template.clientSignatureLabel, icon: '✍️' },
                ].map((sig, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        borderBottom: '2px solid #B8912E',
                        height: '50px',
                        marginBottom: '10px',
                        background: '#FAF8F2',
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#B8912E',
                        margin: 0,
                        letterSpacing: '0.2px',
                      }}
                    >
                      {sig.icon} {sig.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div
            style={{
              padding: '14px 24px',
              background: '#FAF8F2',
              borderTop: '1px solid #F6ECCB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={15} color="#C8A13C" />
              <span style={{ fontSize: '12px', color: '#C8A13C' }}>
                {isArabic
                  ? 'نموذج قياسي محسّن للطباعة على صفحة A4 واحدة'
                  : 'Modèle standard optimisé pour impression A4 sur une seule page'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: '1.5px solid #ECD9A0',
                  background: '#fff',
                  color: '#444',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FBF7EA')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
              >
                {isArabic ? 'إغلاق' : 'Fermer'}
              </button>
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                style={{
                  padding: '8px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isPrinting
                    ? '#E0C16D'
                    : 'linear-gradient(135deg, #B8912E 0%, #B8912E 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: isPrinting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  transition: 'opacity 0.2s',
                  boxShadow: '0 4px 14px rgba(0,51,153,0.3)',
                }}
              >
                <Printer size={16} />
                {isPrinting
                  ? isArabic ? 'جاري الطباعة...' : 'Impression...'
                  : isArabic ? 'طباعة' : 'Imprimer'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};
