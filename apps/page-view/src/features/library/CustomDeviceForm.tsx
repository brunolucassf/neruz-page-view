import { Button } from '@neruz/ui';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Radio, RadioGroup } from 'react-aria-components';
import { formatInteger, type MessageKey, t } from '../i18n';
import {
  CUSTOM_TYPES,
  type CustomDraft,
  type CustomOrientation,
  type CustomType,
  createEmptyDraft,
  type DraftErrors,
  defaultOrientationFor,
  draftFromDevice,
  MAX_CUSTOM_NAME_LENGTH,
  SIZE_LIMITS,
  validateDraft,
} from './customDevice';
import { useLibrary } from './libraryStore';

const TYPE_LABEL: Record<CustomType, MessageKey> = {
  phone: 'studio.library.cat.phone',
  tablet: 'studio.library.cat.tablet',
  laptop: 'studio.library.cat.laptop',
  desktop: 'studio.library.cat.desktop',
  tv: 'studio.library.cat.tv',
};

const ORIENTATION_OPTIONS: readonly { value: CustomOrientation; label: MessageKey }[] = [
  { value: 'portrait', label: 'studio.library.custom.orientation.portrait' },
  { value: 'landscape', label: 'studio.library.custom.orientation.landscape' },
];

const NO_ERRORS: DraftErrors = { name: false, width: false, height: false };

export function CustomDeviceForm({ editingId }: { editingId: string | null }) {
  const previous = useLibrary((state) =>
    state.customDevices.find((device) => device.id === editingId),
  );
  const saveCustomDevice = useLibrary((state) => state.saveCustomDevice);
  const closeCustomEditor = useLibrary((state) => state.closeCustomEditor);
  const [draft, setDraft] = useState<CustomDraft>(() =>
    previous ? draftFromDevice(previous) : createEmptyDraft(),
  );
  const [errors, setErrors] = useState<DraftErrors>(NO_ERRORS);
  const [hasPickedOrientation, setHasPickedOrientation] = useState(!!previous);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const patch = (change: Partial<CustomDraft>) => {
    setDraft((current) => ({ ...current, ...change }));
    setErrors(NO_ERRORS);
  };

  const chooseType = (type: CustomType) =>
    patch({ type, ...(hasPickedOrientation ? {} : { orientation: defaultOrientationFor(type) }) });

  const chooseOrientation = (orientation: CustomOrientation) => {
    setHasPickedOrientation(true);
    patch({ orientation });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateDraft(draft, previous);
    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }
    saveCustomDevice(result.value, editingId);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    closeCustomEditor();
  };

  const rangeMessage = t('studio.library.custom.error.range', {
    min: formatInteger(SIZE_LIMITS.min),
    max: formatInteger(SIZE_LIMITS.max),
  });

  return (
    <form className="custom-form" onSubmit={submit} onKeyDown={handleKeyDown} noValidate>
      <h4 className="custom-form__title">
        {t(editingId ? 'studio.library.custom.title.edit' : 'studio.library.custom.title.create')}
      </h4>
      <label className="custom-form__field">
        <span className="custom-form__label">{t('studio.library.custom.name')}</span>
        <input
          ref={nameRef}
          className="pv-input"
          value={draft.name}
          maxLength={MAX_CUSTOM_NAME_LENGTH}
          aria-invalid={errors.name || undefined}
          aria-describedby={errors.name ? 'custom-error-name' : undefined}
          onChange={(event) => patch({ name: event.target.value })}
        />
        {errors.name && (
          <span id="custom-error-name" className="custom-form__error" role="alert">
            {t('studio.library.custom.error.name')}
          </span>
        )}
      </label>
      <div className="custom-form__sizes">
        <SizeField
          label={t('studio.library.custom.width')}
          value={draft.width}
          hasError={errors.width}
          errorMessage={rangeMessage}
          errorId="custom-error-width"
          onChange={(width) => patch({ width })}
        />
        <SizeField
          label={t('studio.library.custom.height')}
          value={draft.height}
          hasError={errors.height}
          errorMessage={rangeMessage}
          errorId="custom-error-height"
          onChange={(height) => patch({ height })}
        />
      </div>
      <label className="custom-form__field">
        <span className="custom-form__label">{t('studio.library.custom.type')}</span>
        <select
          className="pv-input custom-form__select"
          value={draft.type}
          onChange={(event) => chooseType(event.target.value as CustomType)}
        >
          {CUSTOM_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(TYPE_LABEL[type])}
            </option>
          ))}
        </select>
      </label>
      <RadioGroup
        className="custom-form__field"
        orientation="horizontal"
        value={draft.orientation}
        aria-label={t('studio.library.custom.orientation')}
        onChange={(value) => chooseOrientation(value as CustomOrientation)}
      >
        <span className="custom-form__label" aria-hidden="true">
          {t('studio.library.custom.orientation')}
        </span>
        <div className="segmented">
          {ORIENTATION_OPTIONS.map((option) => (
            <Radio key={option.value} value={option.value} className="segmented__option">
              {t(option.label)}
            </Radio>
          ))}
        </div>
      </RadioGroup>
      <div className="custom-form__actions">
        <Button type="submit" variant="primary">
          {t('studio.library.custom.save')}
        </Button>
        <Button variant="ghost" onPress={closeCustomEditor}>
          {t('studio.library.form.cancel')}
        </Button>
      </div>
    </form>
  );
}

type SizeFieldProps = {
  label: string;
  value: string;
  hasError: boolean;
  errorMessage: string;
  errorId: string;
  onChange: (value: string) => void;
};

function SizeField({ label, value, hasError, errorMessage, errorId, onChange }: SizeFieldProps) {
  return (
    <label className="custom-form__field">
      <span className="custom-form__label">{label}</span>
      <input
        className="pv-input pv-tnum"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {hasError && (
        <span id={errorId} className="custom-form__error" role="alert">
          {errorMessage}
        </span>
      )}
    </label>
  );
}
