// ──────────────────────────────────────────────
// BuilderPage — Wraps the Form Builder with routing support
// ──────────────────────────────────────────────

import { useParams } from 'react-router-dom';
import { FormBuilderApp } from '../builder';
import { getSchemaById } from '../schema/registry';

export default function BuilderPage() {
  const { templateId } = useParams();

  let initialJson: Record<string, unknown> | undefined;

  if (templateId) {
    initialJson = getSchemaById(templateId);
  }

  return (
    <div className="fluid-canvas">
      <FormBuilderApp initialJson={initialJson} templateId={templateId} />
    </div>
  );
}