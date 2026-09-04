import React, { useEffect, useState } from 'react';
import { TemplateService, DocumentTemplateRow } from '../services/TemplateService_v2';
import { DocumentType } from '../types';

interface TemplateSelectorProps {
  documentType: DocumentType;
  agencyId: string;
  onSelectTemplate: (template: DocumentTemplateRow) => void;
  onCancel?: () => void;
  initialTemplateId?: string;
}

/**
 * Reusable Template Selector Component (v2 - Strict Database-Only)
 * 
 * Displays all templates for a document type
 * User must explicitly select one
 * NO auto-selection or defaults (fail-safe approach)
 */
export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  documentType,
  agencyId,
  onSelectTemplate,
  onCancel,
  initialTemplateId,
}) => {
  const [templates, setTemplates] = useState<DocumentTemplateRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialTemplateId || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [documentType, agencyId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await TemplateService.getTemplatesByType(documentType, agencyId);
      setTemplates(result);

      if (result.length === 0) {
        setError(
          `No templates found for ${documentType}. Please create one in Document Templates.`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to load templates for ${documentType}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (!selectedId) {
      setError('Please select a template');
      return;
    }

    const selected = templates.find((t) => t.id === selectedId);
    if (selected) {
      onSelectTemplate(selected);
    }
  };

  if (loading) {
    return (
      <div className="template-selector loading">
        <p>Loading templates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="template-selector error">
        <p className="error-message">{error}</p>
        {onCancel && (
          <button onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
        )}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="template-selector empty">
        <p>No templates available for {documentType}</p>
        {onCancel && (
          <button onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="template-selector">
      <div className="template-list">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`template-item ${selectedId === template.id ? 'selected' : ''}`}
            onClick={() => setSelectedId(template.id)}
          >
            <input
              type="radio"
              name="template"
              value={template.id}
              checked={selectedId === template.id}
              onChange={() => setSelectedId(template.id)}
            />
            <div className="template-info">
              <span className="template-name">{template.name}</span>
              {template.is_default && <span className="badge badge-primary">Default</span>}
              {template.template.has_conditions && (
                <span className="badge badge-info">+ Conditions</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="template-actions">
        <button
          onClick={handleSelect}
          disabled={!selectedId}
          className="btn btn-primary"
        >
          Use Selected Template
        </button>
        {onCancel && (
          <button onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
        )}
      </div>

      <style>{`
        .template-selector {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px;
          background: #FAF8F2;
          border-radius: 8px;
          min-width: 400px;
        }

        .template-selector.loading,
        .template-selector.error,
        .template-selector.empty {
          align-items: center;
          justify-content: center;
          min-height: 200px;
        }

        .template-selector.error,
        .template-selector.empty {
          background: #FBF7EA;
          border: 1px solid #F6ECCB;
        }

        .error-message {
          color: #B8912E;
          text-align: center;
          margin-bottom: 16px;
        }

        .template-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 400px;
          overflow-y: auto;
        }

        .template-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: white;
          border: 2px solid #E8E0CD;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .template-item:hover {
          border-color: #C8A13C;
          background: #FBF7EA;
        }

        .template-item.selected {
          border-color: #C8A13C;
          background: #FBF7EA;
        }

        .template-item input[type='radio'] {
          cursor: pointer;
          width: 18px;
          height: 18px;
        }

        .template-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .template-name {
          font-weight: 500;
          color: #201D15;
        }

        .badge {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 3px;
          font-weight: 600;
          white-space: nowrap;
        }

        .badge-primary {
          background: #F6ECCB;
          color: #B8912E;
        }

        .badge-info {
          background: #F6ECCB;
          color: #B8912E;
        }

        .template-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          padding-top: 12px;
          border-top: 1px solid #E8E0CD;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #C8A13C;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #C8A13C;
        }

        .btn-primary:disabled {
          background: #E8E0CD;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #F3EEE1;
          color: #302C21;
          border: 1px solid #E8E0CD;
        }

        .btn-secondary:hover {
          background: #E8E0CD;
        }
      `}</style>
    </div>
  );
};
