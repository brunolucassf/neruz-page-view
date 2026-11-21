import { describe, expect, it } from 'vitest';
import {
  createEmptyDraft,
  customToDevice,
  draftFromDevice,
  searchCustomDevices,
  validateDraft,
} from './customDevice';

const validDraft = { ...createEmptyDraft(), name: '  Totem  ', width: '1080', height: '1920' };

describe('validateDraft', () => {
  it('aceita um rascunho válido e aplica trim no nome', () => {
    const result = validateDraft(validDraft);
    expect(result.isValid).toBe(true);
    if (result.isValid)
      expect(result.value).toMatchObject({ name: 'Totem', width: 1080, height: 1920 });
  });

  it('marca nome vazio, largura fora do limite e altura não inteira', () => {
    const result = validateDraft({ ...validDraft, name: ' ', width: '199', height: '10.5' });
    expect(result).toEqual({ isValid: false, errors: { name: true, width: true, height: true } });
  });

  it('rejeita acima de 7680', () => {
    const result = validateDraft({ ...validDraft, height: '7681' });
    expect(result.isValid).toBe(false);
  });

  it('orienta as medidas: em pé deixa a altura maior, deitada a largura maior', () => {
    const portrait = validateDraft({ ...validDraft, width: '1920', height: '1080' });
    const landscape = validateDraft({ ...validDraft, orientation: 'landscape' });
    expect(portrait.isValid && portrait.value).toMatchObject({ width: 1080, height: 1920 });
    expect(landscape.isValid && landscape.value).toMatchObject({ width: 1920, height: 1080 });
  });

  it('mantém o dpr ao editar sem trocar o tipo', () => {
    const previous = {
      id: crypto.randomUUID(),
      name: 'X',
      width: 400,
      height: 800,
      dpr: 2.5,
      type: 'phone' as const,
      frame: 'phone' as const,
    };
    const result = validateDraft(draftFromDevice(previous), previous);
    expect(result.isValid && result.value.dpr).toBe(2.5);
  });
});

describe('customToDevice e busca', () => {
  const custom = {
    id: crypto.randomUUID(),
    name: 'Cardápio Digital',
    width: 1080,
    height: 1920,
    dpr: 1,
    type: 'tv' as const,
    frame: 'monitor' as const,
  };

  it('converte para o formato da biblioteca', () => {
    expect(customToDevice(custom)).toMatchObject({
      id: custom.id,
      category: 'tv',
      isEssential: false,
    });
  });

  it('busca sem acento e sem diferenciar maiúsculas', () => {
    expect(searchCustomDevices([custom], 'cardapio')).toHaveLength(1);
    expect(searchCustomDevices([custom], 'xyz')).toHaveLength(0);
  });
});
