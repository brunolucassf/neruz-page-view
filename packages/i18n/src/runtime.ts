export type Locale = 'pt-BR' | 'en' | 'es';
export type MessageParams = Record<string, string | number>;
export type Messages = Readonly<Record<string, string>>;

const PLACEHOLDER = /\{(\w+)\}/g;

export function createTranslator<TMessages extends Messages>(locale: Locale, messages: TMessages) {
  const pluralRules = new Intl.PluralRules(locale);
  const numberFormat = new Intl.NumberFormat(locale);
  const lookup: Readonly<Record<string, string | undefined>> = messages;

  const formatValue = (value: string | number) =>
    typeof value === 'number' ? numberFormat.format(value) : value;

  const pickTemplate = (key: string, params?: MessageParams) => {
    const count = params?.n;
    if (typeof count === 'number') {
      const plural = lookup[`${key}_${pluralRules.select(count)}`];
      if (plural) return plural;
    }
    return lookup[key] ?? key;
  };

  return function translate(key: keyof TMessages & string, params?: MessageParams): string {
    const template = pickTemplate(key, params);
    if (!params) return template;
    return template.replace(PLACEHOLDER, (match, name: string) => {
      const value = params[name];
      return value === undefined ? match : formatValue(value);
    });
  };
}

export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(locale).format(value);
}
