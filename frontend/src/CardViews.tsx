import React from 'react';

// Four alternative ways to show a recipe card, picked with the 1-5 buttons above the card
// (card 1 is the editable table in App.tsx). Read-only sketches to find the layout that sticks.

export interface CardIngredient {
  name: string;
  quantity: number;
  unit: string;
  grams: number;
  original_text: string;
}

interface Props {
  view: number;
  ingredients: CardIngredient[];
  ratios: any;
  colorOf: (name: string) => string;
  notes?: React.ReactNode;
}

const KEY = ['flour', 'pasta', 'bread', 'cornstarch', 'water', 'milk', 'cream', 'stock', 'broth', 'egg', 'butter', 'oil', 'lard', 'shortening', 'sugar', 'honey', 'syrup'];
const isKey = (n: string) => KEY.some((k) => n.toLowerCase().includes(k));

function amount(i: CardIngredient): string {
  const q = i.quantity;
  const whole = Math.floor(q), frac = q - whole;
  const fr: Record<string, string> = { '0.25': '¼', '0.33': '⅓', '0.50': '½', '0.67': '⅔', '0.75': '¾' };
  const f = fr[frac.toFixed(2)] || (frac ? frac.toFixed(2).replace(/^0/, '') : '');
  const n = whole ? String(whole) + f : f || '0';
  const unit = i.unit && i.unit.toLowerCase() !== i.name.toLowerCase() ? ' ' + i.unit : '';
  return (n + unit).trim();
}
const g = (x: number) => (x > 0 ? Math.round(x) + ' g' : '');

function RatioLine({ ratios, big }: { ratios: any; big?: boolean }) {
  const m = ratios && ratios['Main Ratio'];
  if (!m || !m.ratio_string) return null;
  return (
    <div className={big ? 'cv-ratio cv-ratio-big' : 'cv-ratio'}>
      <b>{m.ratio_string}</b>
      <span>{m.categories.join(' : ')}</span>
    </div>
  );
}

export default function CardView({ view, ingredients, ratios, colorOf, notes }: Props) {
  const key = ingredients.filter((i) => isKey(i.name));
  const rest = ingredients.filter((i) => !isKey(i.name));
  const total = ingredients.reduce((s, i) => s + (i.grams > 0 ? i.grams : 0), 0);

  // 2: index card - a recipe card from a kitchen drawer
  if (view === 2) {
    return (
      <div className="cv cv-index">
        <RatioLine ratios={ratios} big />
        <ul>
          {ingredients.map((i, k) => (
            <li key={k} className={isKey(i.name) ? 'key' : ''}>
              <span className="amt">{amount(i)}</span>
              <span className="nm">{i.name}</span>
              <span className="gr">{g(i.grams)}</span>
            </li>
          ))}
        </ul>
        {notes}
      </div>
    );
  }

  // 3: weight bar - how the recipe splits by weight, then the list
  if (view === 3) {
    const weighed = ingredients.filter((i) => i.grams > 0).sort((a, b) => b.grams - a.grams);
    return (
      <div className="cv cv-bars">
        <RatioLine ratios={ratios} />
        <div className="stack" role="img" aria-label="Share of the recipe's weight">
          {weighed.map((i, k) => (
            <i key={k} style={{ flexGrow: i.grams, background: colorOf(i.name) }} title={i.name + ' ' + g(i.grams)} />
          ))}
        </div>
        <ul>
          {weighed.map((i, k) => (
            <li key={k}>
              <span className="dot" style={{ background: colorOf(i.name) }} />
              <span className="nm">{i.name}</span>
              <span className="pc">{total ? Math.round((i.grams / total) * 100) + '%' : ''}</span>
              <span className="amt">{amount(i)}</span>
            </li>
          ))}
        </ul>
        {ingredients.some((i) => !(i.grams > 0)) && (
          <p className="also">Also: {ingredients.filter((i) => !(i.grams > 0)).map((i) => amount(i) + ' ' + i.name).join(' · ')}</p>
        )}
      </div>
    );
  }

  // 4: receipt - itemised, totalled, the ratio as the bottom line
  if (view === 4) {
    return (
      <div className="cv cv-receipt">
        <div className="hd">*** RATIO.AI ***</div>
        {ingredients.map((i, k) => (
          <div key={k} className="ln">
            <span>{amount(i)} {i.name}</span>
            <span className="dots" />
            <span>{g(i.grams) || '--'}</span>
          </div>
        ))}
        <div className="rule" />
        <div className="ln tot"><span>TOTAL WEIGHED</span><span className="dots" /><span>{Math.round(total)} g</span></div>
        <div className="ln tot"><span>ITEMS</span><span className="dots" /><span>{ingredients.length}</span></div>
        <div className="rule" />
        <RatioLine ratios={ratios} big />
        <div className="hd">THANK YOU · COOK AGAIN</div>
      </div>
    );
  }

  // 5: tiles - the ingredients that make the ratio as big tiles, everything else as chips
  return (
    <div className="cv cv-tiles">
      <RatioLine ratios={ratios} big />
      <div className="tiles">
        {(key.length ? key : ingredients.slice(0, 4)).map((i, k) => (
          <div key={k} className="tile" style={{ borderColor: colorOf(i.name) }}>
            <b>{amount(i)}</b>
            <span style={{ color: colorOf(i.name) }}>{i.name}</span>
            <small>{g(i.grams)}</small>
          </div>
        ))}
      </div>
      <div className="chips">
        {(key.length ? rest : ingredients.slice(4)).map((i, k) => (
          <span key={k} className="chip">{amount(i)} {i.name}</span>
        ))}
      </div>
    </div>
  );
}
