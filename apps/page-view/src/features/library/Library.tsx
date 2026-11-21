import type { Kit } from '@neruz/core';
import {
  type Device,
  ESSENTIAL_DEVICES,
  listDevicesByCategory,
  searchDevices,
} from '@neruz/devices';
import { Button, IconButton } from '@neruz/ui';
import { ChevronDown, PanelLeftOpen, Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Input, SearchField } from 'react-aria-components';
import { formatSize, type MessageKey, t } from '../i18n';
import { findAnyDevice } from '../screens/deviceRegistry';
import { MAX_SCREENS } from '../screens/presets';
import { useMaxActiveScreens } from '../settings/settingsStore';
import { selectCanSaveKit, useStudio } from '../shell/studioStore';
import { showToast } from '../toasts/toastStore';
import { CustomDeviceForm } from './CustomDeviceForm';
import { customToDevice, searchCustomDevices } from './customDevice';
import { LIBRARY_SECTIONS, type LibrarySection, useLibrary } from './libraryStore';
import './library.css';

const ICON = {
  size: 16,
  strokeWidth: 1.75,
  strokeLinejoin: 'miter',
  strokeLinecap: 'square',
} as const;

const SECTION_LABEL: Record<LibrarySection, MessageKey> = {
  essentials: 'studio.library.cat.essentials',
  favorites: 'studio.library.cat.favorites',
  kits: 'studio.library.cat.kits',
  custom: 'studio.library.cat.custom',
  phone: 'studio.library.cat.phone',
  foldable: 'studio.library.cat.foldable',
  tablet: 'studio.library.cat.tablet',
  laptop: 'studio.library.cat.laptop',
  desktop: 'studio.library.cat.desktop',
  tv: 'studio.library.cat.tv',
};

const ESSENTIAL_IDS = ESSENTIAL_DEVICES.map((device) => device.id);

export function loadEssentialsKit(): void {
  useStudio.getState().loadDevices(ESSENTIAL_IDS);
  showToast({
    tone: 'neutral',
    title: t('studio.library.kit.essentials.loaded'),
    actions: [{ label: t('state.undo'), onPress: () => useStudio.getState().undo() }],
  });
}

export function Library() {
  const isOpen = useLibrary((state) => state.isOpen);
  const open = useLibrary((state) => state.open);
  const close = useLibrary((state) => state.close);
  const swapScreenId = useLibrary((state) => state.swapScreenId);
  const swapName = useStudio(
    (state) => state.screens.find((screen) => screen.id === swapScreenId)?.name ?? '',
  );
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      event.stopPropagation();
      close();
    }
  };

  return (
    <aside
      className="library"
      data-open={isOpen || undefined}
      aria-label={t('studio.library.title')}
      onKeyDown={handleKeyDown}
    >
      <div className="library__rail">
        <IconButton label={t('studio.library.expand')} onPress={() => open()}>
          <PanelLeftOpen {...ICON} aria-hidden="true" />
        </IconButton>
        <IconButton label={t('studio.library.add')} onPress={() => open()}>
          <Plus {...ICON} aria-hidden="true" />
        </IconButton>
        <IconButton label={t('studio.library.search.placeholder')} onPress={() => open()}>
          <Search {...ICON} aria-hidden="true" />
        </IconButton>
      </div>
      <div className="library__panel">
        <header className="library__header">
          <h2 className="library__title">
            {swapScreenId
              ? t('studio.library.swap.title', { device: swapName })
              : t('studio.library.title')}
          </h2>
          <IconButton
            label={t('studio.library.collapse')}
            className="library__close"
            onPress={close}
          >
            <X {...ICON} aria-hidden="true" />
          </IconButton>
        </header>
        {swapScreenId && <p className="library__swap-hint">{t('studio.library.swap.hint')}</p>}
        <SearchField
          className="library__search"
          aria-label={t('studio.library.search.placeholder')}
        >
          <Search className="library__search-icon" {...ICON} aria-hidden="true" />
          <Input
            ref={searchRef}
            className="pv-input library__search-input"
            placeholder={t('studio.library.search.placeholder')}
            spellCheck={false}
            onChange={(event) => useLibrary.getState().setQuery(event.target.value)}
          />
        </SearchField>
        <div className="library__scroll">
          <LibraryBody />
        </div>
      </div>
    </aside>
  );
}

function LibraryBody() {
  const query = useLibrary((state) => state.query);
  if (query.trim()) return <SearchResults query={query} />;
  return (
    <>
      <KitActions />
      {LIBRARY_SECTIONS.map((section) => (
        <Section key={section} section={section} />
      ))}
    </>
  );
}

function SearchResults({ query }: { query: string }) {
  const customDevices = useLibrary((state) => state.customDevices);
  const results = [
    ...searchCustomDevices(customDevices, query).map(customToDevice),
    ...searchDevices(query),
  ];
  if (results.length === 0) {
    return <p className="library__empty">{t('studio.library.search.empty', { query })}</p>;
  }
  return <DeviceList devices={results} />;
}

function KitActions() {
  const maxActiveScreens = useMaxActiveScreens();
  const swapScreenId = useLibrary((state) => state.swapScreenId);
  const canSaveKit = useStudio(selectCanSaveKit);
  const [isNaming, setIsNaming] = useState(false);
  const [kitName, setKitName] = useState('');
  const paused = Math.max(0, ESSENTIAL_IDS.length - maxActiveScreens);
  if (swapScreenId) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    useLibrary.getState().saveCurrentKit(kitName);
    setKitName('');
    setIsNaming(false);
  };

  return (
    <div className="library__kit-actions">
      <Button variant="secondary" onPress={loadEssentialsKit}>
        {t('studio.library.kit.essentials.load', { n: ESSENTIAL_IDS.length })}
      </Button>
      {paused > 0 && (
        <p className="library__note">
          {t('studio.library.kit.essentials.paused', { paused, max: maxActiveScreens })}
        </p>
      )}
      {canSaveKit && !isNaming && (
        <Button variant="ghost" onPress={() => setIsNaming(true)}>
          {t('studio.library.kit.saveCurrent')}
        </Button>
      )}
      {canSaveKit && isNaming && (
        <form className="library__kit-form" onSubmit={submit}>
          <input
            className="pv-input"
            value={kitName}
            maxLength={60}
            placeholder={t('studio.library.kit.name.placeholder')}
            aria-label={t('studio.library.kit.name.placeholder')}
            onChange={(event) => setKitName(event.target.value)}
          />
          <Button type="submit" variant="secondary" isDisabled={!kitName.trim()}>
            {t('studio.library.kit.save')}
          </Button>
        </form>
      )}
    </div>
  );
}

function Section({ section }: { section: LibrarySection }) {
  const isExpanded = useLibrary((state) => !!state.openSections[section]);
  const toggleSection = useLibrary((state) => state.toggleSection);
  const swapScreenId = useLibrary((state) => state.swapScreenId);
  if (swapScreenId && section === 'kits') return null;
  const bodyId = `library-section-${section}`;
  return (
    <section className="library__section" data-expanded={isExpanded || undefined}>
      <h3 className="library__section-heading">
        <button
          type="button"
          className="library__section-trigger"
          aria-expanded={isExpanded}
          aria-controls={bodyId}
          onClick={() => toggleSection(section)}
        >
          {t(SECTION_LABEL[section])}
          <ChevronDown className="library__chevron" {...ICON} aria-hidden="true" />
        </button>
      </h3>
      {isExpanded && (
        <div id={bodyId} className="library__section-body">
          <SectionBody section={section} />
        </div>
      )}
    </section>
  );
}

function SectionBody({ section }: { section: LibrarySection }) {
  const favorites = useLibrary((state) => state.favorites);
  const customDevices = useLibrary((state) => state.customDevices);
  if (section === 'essentials') {
    return (
      <>
        <p className="library__note">{t('studio.library.cat.essentials.hint')}</p>
        <DeviceList devices={ESSENTIAL_DEVICES} />
      </>
    );
  }
  if (section === 'favorites') {
    const devices = favorites
      .map((id) => findAnyDevice(id))
      .filter((item): item is Device => !!item);
    if (devices.length === 0) {
      return <p className="library__empty">{t('studio.library.favorites.empty')}</p>;
    }
    return <DeviceList devices={devices} />;
  }
  if (section === 'kits') return <KitList />;
  if (section === 'custom') return <CustomSection devices={customDevices.map(customToDevice)} />;
  return <DeviceList devices={listDevicesByCategory(section)} />;
}

function KitList() {
  const kits = useLibrary((state) => state.kits);
  const [pending, setPending] = useState<{ id: string; mode: 'rename' | 'delete' } | null>(null);
  if (kits.length === 0) return <p className="library__empty">{t('studio.library.kits.empty')}</p>;
  return (
    <ul className="library__list">
      {kits.map((kit) => {
        const mode = pending?.id === kit.id ? pending.mode : null;
        if (mode === 'rename') {
          return <KitRenameRow key={kit.id} kit={kit} onDone={() => setPending(null)} />;
        }
        if (mode === 'delete') {
          return (
            <ConfirmDeleteRow
              key={kit.id}
              message={t('studio.library.kit.delete.confirm', { name: kit.name })}
              onConfirm={() => {
                useLibrary.getState().deleteKit(kit.id);
                setPending(null);
              }}
              onCancel={() => setPending(null)}
            />
          );
        }
        return (
          <li key={kit.id} className="library__item">
            <span className="library__item-text">
              <span className="library__item-name">{kit.name}</span>
              <span className="library__item-size pv-tnum">{kit.deviceIds.length}</span>
            </span>
            <IconButton
              label={t('studio.library.kit.rename', { name: kit.name })}
              className="library__icon-button"
              onPress={() => setPending({ id: kit.id, mode: 'rename' })}
            >
              <Pencil {...ICON} aria-hidden="true" />
            </IconButton>
            <IconButton
              label={t('studio.library.kit.delete')}
              className="library__icon-button"
              onPress={() => setPending({ id: kit.id, mode: 'delete' })}
            >
              <Trash2 {...ICON} aria-hidden="true" />
            </IconButton>
            <Button
              variant="secondary"
              className="library__kit-open"
              onPress={() => {
                useStudio.getState().loadDevices(kit.deviceIds);
                showToast({
                  tone: 'neutral',
                  title: t('studio.library.kit.loaded', { name: kit.name }),
                  actions: [{ label: t('state.undo'), onPress: () => useStudio.getState().undo() }],
                });
              }}
            >
              {t('studio.library.kit.apply')}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

function KitRenameRow({ kit, onDone }: { kit: Kit; onDone: () => void }) {
  const [name, setName] = useState(kit.name);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.select();
  }, []);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    useLibrary.getState().renameKit(kit.id, name);
    onDone();
  };
  return (
    <li className="library__item library__item--form">
      <form
        className="library__row-form"
        onSubmit={submit}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          event.stopPropagation();
          onDone();
        }}
      >
        <input
          ref={inputRef}
          className="pv-input"
          value={name}
          maxLength={60}
          aria-label={t('studio.library.kit.name.placeholder')}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="library__confirm-actions">
          <Button type="submit" variant="secondary" isDisabled={!name.trim()}>
            {t('studio.library.kit.rename.save')}
          </Button>
          <Button variant="ghost" onPress={onDone}>
            {t('studio.library.form.cancel')}
          </Button>
        </div>
      </form>
    </li>
  );
}

type ConfirmDeleteRowProps = { message: string; onConfirm: () => void; onCancel: () => void };

function ConfirmDeleteRow({ message, onConfirm, onCancel }: ConfirmDeleteRowProps) {
  return (
    <li
      className="library__item library__item--form"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        onCancel();
      }}
    >
      <div className="library__row-form" role="alertdialog" aria-label={message}>
        <p className="library__confirm-text">{message}</p>
        <div className="library__confirm-actions">
          <Button variant="secondary" autoFocus onPress={onConfirm}>
            {t('studio.library.confirm.delete')}
          </Button>
          <Button variant="ghost" onPress={onCancel}>
            {t('studio.library.form.cancel')}
          </Button>
        </div>
      </div>
    </li>
  );
}

function CustomSection({ devices }: { devices: readonly Device[] }) {
  const editor = useLibrary((state) => state.customEditor);
  return (
    <>
      {!editor && (
        <div className="library__kit-actions">
          <Button variant="secondary" onPress={() => useLibrary.getState().openCustomEditor(null)}>
            {t('studio.library.custom.new')}
          </Button>
        </div>
      )}
      {editor && <CustomDeviceForm key={editor.editingId ?? 'new'} editingId={editor.editingId} />}
      {devices.length === 0 && !editor && (
        <p className="library__empty">{t('studio.library.custom.empty')}</p>
      )}
      {devices.length > 0 && <DeviceList devices={devices} isManageable />}
    </>
  );
}

function DeviceList({
  devices,
  isManageable = false,
}: {
  devices: readonly Device[];
  isManageable?: boolean;
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const activePresetId = useStudio(
    (state) => state.screens.find((screen) => screen.id === state.activeScreenId)?.presetId,
  );
  const favorites = useLibrary((state) => state.favorites);
  const toggleFavorite = useLibrary((state) => state.toggleFavorite);
  const pickDevice = useLibrary((state) => state.pickDevice);
  const isFull = useStudio((state) => state.screens.length >= MAX_SCREENS);
  const swapScreenId = useLibrary((state) => state.swapScreenId);

  const moveFocus = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const buttons = [
      ...(listRef.current?.querySelectorAll<HTMLButtonElement>('[data-device-add]') ?? []),
    ];
    const index = buttons.findIndex((button) => button.matches(':focus'));
    const next = buttons[index + (event.key === 'ArrowDown' ? 1 : -1)];
    if (!next) return;
    event.preventDefault();
    next.focus();
  };

  const pick = (device: Device) => {
    if (isFull && !swapScreenId) {
      showToast({ tone: 'neutral', title: t('studio.library.limit', { n: MAX_SCREENS }) });
      return;
    }
    pickDevice(device);
  };

  return (
    <ul
      ref={listRef}
      className="library__list"
      data-manageable={isManageable || undefined}
      onKeyDown={moveFocus}
    >
      {devices.map((device) => {
        if (pendingDeleteId === device.id) {
          return (
            <ConfirmDeleteRow
              key={device.id}
              message={t('studio.library.custom.delete.confirm', { name: device.name })}
              onConfirm={() => {
                useLibrary.getState().deleteCustomDevice(device.id);
                setPendingDeleteId(null);
              }}
              onCancel={() => setPendingDeleteId(null)}
            />
          );
        }
        const isFavorite = favorites.includes(device.id);
        return (
          <li
            key={device.id}
            className="library__item"
            data-active={device.id === activePresetId || undefined}
          >
            <span className="library__item-text">
              <span className="library__item-name">{device.name}</span>
              <span className="library__item-size pv-tnum">
                {formatSize(device.width, device.height)}
              </span>
            </span>
            <button
              type="button"
              className="library__icon-button library__star"
              aria-pressed={isFavorite}
              aria-label={`${isFavorite ? t('studio.library.favorite.remove') : t('studio.library.favorite.add')}: ${device.name}`}
              onClick={() => toggleFavorite(device.id)}
            >
              <Star {...ICON} aria-hidden="true" />
            </button>
            {isManageable && (
              <>
                <button
                  type="button"
                  className="library__icon-button"
                  aria-label={t('studio.library.custom.edit', { device: device.name })}
                  onClick={() => useLibrary.getState().openCustomEditor(device.id)}
                >
                  <Pencil {...ICON} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="library__icon-button"
                  aria-label={t('studio.library.custom.delete', { device: device.name })}
                  onClick={() => setPendingDeleteId(device.id)}
                >
                  <Trash2 {...ICON} aria-hidden="true" />
                </button>
              </>
            )}
            <button
              type="button"
              className="library__icon-button library__add"
              data-device-add=""
              aria-label={t('studio.library.item.add', { device: device.name })}
              onClick={() => pick(device)}
            >
              <Plus {...ICON} aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
