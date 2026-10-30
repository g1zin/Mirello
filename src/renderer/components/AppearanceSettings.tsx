import { Moon, Sun, Monitor, Check, RotateCcw } from 'lucide-react';
import type { State } from '../../shared/model';
import type { Dispatch } from './BoardView';

export function AppearanceSettings({
  settings,
  dispatch,
}: {
  settings: State['settings'];
  dispatch: Dispatch;
}) {
  const cherry = settings.visualStyle === 'sky-cherry';
  return (
    <div className="appearance-controls">
      <fieldset className="appearance-group">
        <legend>Estilo visual</legend>
        <div className="style-picker">
          {(
            [
              { id: 'original', name: 'Original', description: 'Cores e simplicidade do Mirello.' },
              {
                id: 'sky-cherry',
                name: 'Céu e Cerejeiras',
                description: 'Um jardim tranquilo para suas ideias.',
              },
            ] as const
          ).map((style) => (
            <button
              key={style.id}
              className={'style-choice ' + (settings.visualStyle === style.id ? 'selected' : '')}
              aria-pressed={settings.visualStyle === style.id}
              onClick={() =>
                void dispatch({ type: 'settings.update', patch: { visualStyle: style.id } })
              }
            >
              <span className={'style-thumbnail thumbnail-' + style.id} aria-hidden="true">
                <i />
                <i />
                <i />
                {settings.visualStyle === style.id && (
                  <span className="style-selected">
                    <Check size={14} />
                  </span>
                )}
              </span>
              <strong>{style.name}</strong>
              <small>{style.description}</small>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="appearance-group">
        <legend>Modo</legend>
        <div className="theme-picker">
          {(
            [
              { id: 'light', name: 'Claro', Icon: Sun },
              { id: 'dark', name: 'Escuro', Icon: Moon },
              { id: 'system', name: 'Sistema', Icon: Monitor },
            ] as const
          ).map(({ id, name, Icon }) => (
            <button
              key={id}
              className={settings.theme === id ? 'selected' : ''}
              aria-pressed={settings.theme === id}
              onClick={() => void dispatch({ type: 'settings.update', patch: { theme: id } })}
            >
              <Icon size={22} />
              {name}
            </button>
          ))}
        </div>
        <p className="muted small-text">
          O modo é independente do estilo. Sistema acompanha a preferência do computador.
        </p>
      </fieldset>
      <fieldset className="appearance-group" disabled={!cherry}>
        <legend>Decoração</legend>
        <label className="intensity-label" htmlFor="decoration-intensity">
          Intensidade da decoração{' '}
          <output htmlFor="decoration-intensity">
            {settings.decorationIntensity === 0 ? 'Desativada' : settings.decorationIntensity + '%'}
          </output>
        </label>
        <input
          id="decoration-intensity"
          aria-label="Intensidade da decoração"
          type="range"
          min="0"
          max="100"
          step="5"
          value={settings.decorationIntensity}
          onChange={(e) =>
            void dispatch({
              type: 'settings.update',
              patch: { decorationIntensity: Number(e.target.value) },
            })
          }
        />
        <div className="range-captions">
          <span>Sem decoração</span>
          <span>Mais presente</span>
        </div>
        <label className="animation-setting">
          <input
            type="checkbox"
            checked={settings.decorativeAnimations}
            onChange={(e) =>
              void dispatch({
                type: 'settings.update',
                patch: { decorativeAnimations: e.target.checked },
              })
            }
          />
          Animações decorativas
        </label>
        <p className="muted small-text">
          Poucas pétalas se movem lentamente junto à marca e pela barra lateral. A preferência de
          reduzir movimentos do computador sempre é respeitada.
        </p>
      </fieldset>
      {cherry && (
        <div className="appearance-note">
          <p>
            A paleta deste estilo combina céu e flores. Suas cores personalizadas ficam guardadas e
            reaparecem ao voltar ao Original.
          </p>
          <button
            className="soft-button small"
            onClick={() =>
              void dispatch({ type: 'settings.update', patch: { visualStyle: 'original' } })
            }
          >
            <RotateCcw size={14} />
            Voltar à aparência original
          </button>
        </div>
      )}
    </div>
  );
}
