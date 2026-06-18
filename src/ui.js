import {
  APP_NAME,
  GENRE_OPTIONS,
  OWNER_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  escapeHtml,
  formatDate,
  formatDateTime,
  formatYear,
  getInitials,
  ratingStars,
} from './utils';

const LOGO_SRC = `${import.meta.env.BASE_URL}brand/blu-ray-logo.png`;

const ICONS = {
  app: 'M12 3.25c-4.86 0-8.75 3.89-8.75 8.75S7.14 20.75 12 20.75 20.75 16.86 20.75 12 16.86 3.25 12 3.25Zm0 3.1c3.14 0 5.65 2.51 5.65 5.65S15.14 17.65 12 17.65 6.35 15.14 6.35 12 8.86 6.35 12 6.35Zm0 2.1a3.55 3.55 0 1 0 0 7.1 3.55 3.55 0 0 0 0-7.1Z',
  plus: 'M11 5h2v14h-2zM5 11h14v2H5z',
  search: 'M10.5 4.25a6.25 6.25 0 1 1 0 12.5 6.25 6.25 0 0 1 0-12.5Zm0 2.25a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm7.75 9.77 2.5 2.5-1.58 1.58-2.5-2.5 1.58-1.58Z',
  filter: 'M4 6h16v2L14 13v4l-4 2v-6L4 8V6Z',
  sort: 'M6 5h12v2H6V5Zm0 6h8v2H6v-2Zm0 6h4v2H6v-2Z',
  edit: 'M4 16.75V20h3.25l9.6-9.6-3.25-3.25L4 16.75Zm15.3-9.55a.84.84 0 0 0 0-1.18l-2.32-2.32a.84.84 0 0 0-1.18 0l-1.8 1.8 3.5 3.5 1.8-1.8Z',
  trash: 'M5 7h14v2H5V7Zm2 2h10l-1 11H8L7 9Zm3-5h4l1 1h4v2H4V5h4l1-1Z',
  close: 'm7.3 6.3 5.7 5.7 5.7-5.7 1.3 1.3-5.7 5.7 5.7 5.7-1.3 1.3-5.7-5.7-5.7 5.7-1.3-1.3 5.7-5.7-5.7-5.7 1.3-1.3Z',
  logout: 'M5 5h6v2H7v10h4v2H5V5Zm10.5 2.5 4 4-4 4-1.4-1.4 1.6-1.6H9v-2h6.7l-1.6-1.6 1.4-1.4Z',
  image: 'M5 6h14v12H5V6Zm2 2v6l2.2-2.2 2.2 2.2L15 10l2 2V8H7Zm2 1.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z',
  collection: 'M4 6.5h16v11H4v-11Zm2 2v7h12v-7H6Zm1.2 8.5h9.6v2H7.2v-2Z',
  download: 'M11 3h2v8.3l2.8-2.8 1.4 1.4-5.2 5.2-5.2-5.2 1.4-1.4L11 11.3V3Zm-6 14h12v2H5v-2Z',
  upload: 'M11 20h2v-8.3l2.8 2.8 1.4-1.4-5.2-5.2-5.2 5.2 1.4 1.4L11 11.7V20Zm-6-14h12v2H5V6Z',
  save: 'M5 5h11l3 3v11H5V5Zm2 2v10h10V9.8L14.2 7H7Zm1 1h5v3H8V8Zm0 6h8v1H8v-1Z',
  eye: 'M12 5.25c5.4 0 8.75 6.75 8.75 6.75S17.4 18.75 12 18.75 3.25 12 3.25 12 6.6 5.25 12 5.25Zm0 2.4a4.35 4.35 0 1 0 0 8.7 4.35 4.35 0 0 0 0-8.7Zm0 1.7a2.65 2.65 0 1 1 0 5.3 2.65 2.65 0 0 1 0-5.3Z',
  user: 'M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 6.5c0-3.3 3.1-6 7-6s7 2.7 7 6v.5H5V19Z',
  refresh: 'M6 12a6 6 0 0 1 10.7-3.7l1.3-1.3v4.5h-4.5l1.8-1.8A4 4 0 1 0 16 15h2.2A6 6 0 1 1 6 12Z',
  warning: 'M12 3 2.75 19h18.5L12 3Zm0 5.1 1 5.7h-2l1-5.7Zm0 8.4a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Z',
  google: 'M21.6 12.22c0-.73-.06-1.43-.17-2.11H12v4h5.4c-.24 1.28-.98 2.36-2.07 3.09v2.58h3.35c1.96-1.81 2.92-4.49 2.92-7.56Z',
  grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  list: 'M5 6h14v2H5V6Zm0 5h14v2H5v-2Zm0 5h14v2H5v-2Z',
  check: 'm9.4 16.6-4-4L6.8 11.2l2.6 2.6 7.8-7.8 1.4 1.4-9.2 9.2Z',
  clock: 'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm1 4h-2v5l4 2 .9-1.8-2.9-1.45V8Z',
  cube: 'M12 3 4.5 7.2v9.6L12 21l7.5-4.2V7.2L12 3Zm0 2.3 4.5 2.5L12 10.3 7.5 7.8 12 5.3Z',
};

const NAV_ITEMS = [
  { route: 'home', label: 'Accueil' },
  { route: 'collection', label: 'Collection' },
  { route: 'to-buy', label: 'À acheter' },
  { route: 'buying', label: "En cours d'achat" },
  { route: 'unwatched', label: 'Non visualisé' },
];

function svgIcon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name] || ICONS.app}"></path></svg>`;
}

function chip(label, tone = 'neutral') {
  return `<span class="chip chip--${tone}">${escapeHtml(label)}</span>`;
}

function badge(label, tone = 'neutral') {
  return `<span class="badge badge--${tone}">${escapeHtml(label)}</span>`;
}

function appLogo(className = 'app-logo') {
  return `<img class="${className}" src="${escapeHtml(LOGO_SRC)}" alt="Logo Blu-ray Disc" />`;
}

function coverMarkup(item, className = 'cover-placeholder') {
  return item.coverImageUrl
    ? `<img src="${escapeHtml(item.coverImageUrl)}" alt="Jaquette de ${escapeHtml(item.title)}" loading="lazy" />`
    : `<div class="${className}">${svgIcon('image')}<span>${escapeHtml(getInitials(item.title || 'BR'))}</span></div>`;
}

function statusLabel(item) {
  if (item.status === 'Possédé') {
    return item.watched ? 'Vu' : 'Non visualisé';
  }
  return item.status || '—';
}

export function renderAppState(state) {
  const route = state.route || { type: 'home' };
  const memberName = state.user?.displayName || state.user?.email || '';
  return `
    <div class="app-shell">
      ${renderHeader({ route, offline: state.offline, memberName })}
      ${route.type === 'home' ? renderDashboard(state.summary) : renderMoviePage(state)}
    </div>
  `;
}

function renderHeader({ route, offline, memberName }) {
  return `
    <header class="topbar glass">
      <div class="brand">
        <div class="brand__mark brand__mark--logo">${appLogo()}</div>
        <div>
          <p class="eyebrow">Collection partagée</p>
          <h1>${escapeHtml(APP_NAME)}</h1>
        </div>
      </div>

      <nav class="main-nav" aria-label="Navigation principale">
        ${NAV_ITEMS.map(
          (item) => `
            <button class="nav-pill ${route.type === item.route ? 'is-active' : ''}" type="button" data-action="navigate" data-route="${escapeHtml(item.route)}">
              ${escapeHtml(item.label)}
            </button>
          `
        ).join('')}
      </nav>

      <div class="account-chip">
        <span class="account-chip__avatar">${svgIcon('user')}</span>
        <span>${escapeHtml(memberName || 'Connecté')}</span>
        ${offline ? badge('Hors ligne', 'warning') : ''}
        <button class="icon-button" type="button" data-action="logout" title="Déconnexion">
          ${svgIcon('logout')}
        </button>
      </div>
    </header>
  `;
}

function renderDashboard(summary) {
  const cards = [
    { label: 'Total collection', value: summary.owned, icon: 'collection' },
    { label: 'Films vus', value: summary.watched, icon: 'eye' },
    { label: 'Films non vus', value: summary.unwatched, icon: 'warning' },
    { label: 'À acheter', value: summary.toBuy, icon: 'plus' },
    { label: "En cours d'achat", value: summary.buying, icon: 'clock' },
    { label: 'Films 3D', value: summary.threeD, icon: 'cube' },
    { label: 'vus', value: `${summary.watchedPercent}%`, icon: 'check', progress: summary.watchedPercent },
    { label: 'à acheter', value: `${summary.buyPercent}%`, icon: 'download', progress: summary.buyPercent },
  ];

  return `
    <main class="dashboard">
      <section class="dashboard-grid">
        ${cards.map((card) => renderDashboardCard(card)).join('')}
      </section>
    </main>
  `;
}

function renderDashboardCard(card) {
  return `
    <article class="dashboard-card glass">
      <div class="dashboard-card__icon">${svgIcon(card.icon)}</div>
      <strong>${escapeHtml(card.value)}</strong>
      <span>${escapeHtml(card.label)}</span>
      ${
        typeof card.progress === 'number'
          ? `<div class="progress"><span style="width:${Math.max(0, Math.min(100, card.progress))}%"></span></div>`
          : ''
      }
    </article>
  `;
}

function renderMoviePage(state) {
  const route = state.route || { type: 'collection' };
  const titleMap = {
    collection: 'Collection',
    'to-buy': 'À acheter',
    buying: "En cours d'achat",
    unwatched: 'Non visualisé',
  };

  return `
    <main class="movie-page">
      <section class="toolbar glass">
        <div class="toolbar__top">
          <div>
            <p class="eyebrow">Films</p>
            <h2>${escapeHtml(titleMap[route.type] || 'Collection')}</h2>
          </div>
          <div class="toolbar__actions">
            <button class="icon-toggle ${state.viewMode === 'list' ? 'is-active' : ''}" type="button" data-action="set-view-mode" data-view-mode="list" title="Affichage liste">
              ${svgIcon('list')}
            </button>
            <button class="icon-toggle ${state.viewMode === 'grid' ? 'is-active' : ''}" type="button" data-action="set-view-mode" data-view-mode="grid" title="Affichage grille">
              ${svgIcon('grid')}
            </button>
            <button class="primary-button" type="button" data-action="open-editor">${svgIcon('plus')} Ajouter</button>
          </div>
        </div>

        ${route.type === 'collection' ? renderCollectionFilters(state) : ''}
      </section>

      <section class="content glass">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Résultats</p>
            <h3>${state.filteredBlurays.length} film${state.filteredBlurays.length > 1 ? 's' : ''}</h3>
          </div>
          ${badge(state.loadingBlurays ? 'Chargement...' : 'Prêt', state.loadingBlurays ? 'warning' : 'success')}
        </div>

        ${
          state.loadingBlurays
            ? renderLoadingGrid()
            : state.filteredBlurays.length
              ? renderMovieCollection(state.filteredBlurays, state.viewMode)
              : renderEmptyState(route.type === 'collection' ? 'Aucun film dans cette vue.' : 'Aucun film ici pour le moment.')
        }
      </section>
    </main>
  `;
}

function renderCollectionFilters(state) {
  return `
    <div class="collection-filters">
      <label class="field field--search">
        <input id="search" name="search" type="search" placeholder="Rechercher un titre..." value="" autocomplete="off" />
      </label>

      <label class="select">
        <select name="genre" id="genre">
          <option value="all">Tous les genres</option>
          ${GENRE_OPTIONS.map((genre) => `<option value="${escapeHtml(genre)}">${escapeHtml(genre)}</option>`).join('')}
        </select>
      </label>

      <label class="select">
        <select name="year" id="year">
          <option value="all">Toutes les années</option>
          ${state.yearOptions.map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join('')}
        </select>
      </label>

      <label class="select">
        <select name="sort" id="sort">
          ${SORT_OPTIONS.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('')}
        </select>
      </label>

      <button class="ghost-button" type="button" data-action="reset-filters">${svgIcon('refresh')} Réinitialiser</button>
    </div>
  `;
}

function renderMovieCollection(items, viewMode) {
  if (viewMode === 'list') {
    return `<div class="movie-list">${items.map(renderListItem).join('')}</div>`;
  }

  return `<div class="poster-grid">${items.map(renderPosterCard).join('')}</div>`;
}

function renderPosterCard(item) {
  return `
    <article class="poster-card">
      <button class="poster-card__cover" type="button" data-action="open-detail" data-id="${escapeHtml(item.id)}">
        ${coverMarkup(item)}
      </button>
      <div class="poster-card__body">
        <h4>${escapeHtml(item.title || 'Sans titre')}</h4>
        <p>${escapeHtml(formatYear(item.year))} · ${escapeHtml(statusLabel(item))}</p>
      </div>
    </article>
  `;
}

function renderListItem(item) {
  return `
    <article class="movie-row">
      <button class="movie-row__cover" type="button" data-action="open-detail" data-id="${escapeHtml(item.id)}">
        ${coverMarkup(item)}
      </button>
      <div class="movie-row__main">
        <h4>${escapeHtml(item.title || 'Sans titre')}</h4>
        <p>${escapeHtml(formatYear(item.year))} · ${escapeHtml(item.genre || '—')}</p>
        <div class="tags">
          ${chip(item.owner || 'Commun', 'neutral')}
          ${chip(statusLabel(item), item.watched ? 'success' : 'warning')}
          ${item.is3D ? chip('3D', 'brand') : ''}
        </div>
      </div>
      <div class="card-actions">
        <button class="icon-button icon-button--soft" type="button" data-action="edit" data-id="${escapeHtml(item.id)}" title="Modifier">${svgIcon('edit')}</button>
        <button class="icon-button icon-button--soft" type="button" data-action="delete" data-id="${escapeHtml(item.id)}" title="Supprimer">${svgIcon('trash')}</button>
      </div>
    </article>
  `;
}

function renderLoadingGrid() {
  return `
    <div class="poster-grid">
      ${Array.from({ length: 4 })
        .map(() => `<article class="poster-card poster-card--skeleton"><div class="skeleton skeleton--cover"></div><div class="skeleton skeleton--title"></div></article>`)
        .join('')}
    </div>
  `;
}

function renderEmptyState(message) {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${svgIcon('collection')}</div>
      <h4>${escapeHtml(message)}</h4>
      <button class="primary-button" type="button" data-action="open-editor">${svgIcon('plus')} Ajouter un Blu-ray</button>
    </div>
  `;
}

export function renderAuthScreen({ configured, missingKeys, busy }) {
  return `
    <div class="auth-screen">
      <section class="auth-card glass">
        <div class="auth-card__brand">
          <div class="brand__mark brand__mark--logo">${appLogo()}</div>
          <div>
            <p class="eyebrow">PWA Blu-ray</p>
            <h1>${escapeHtml(APP_NAME)}</h1>
          </div>
        </div>

        <h2>Connecte-toi pour accéder à la collection partagée.</h2>
        <p>Retrouve, ajoute et partage vos Blu-ray depuis le même espace synchronisé.</p>

        ${
          configured
            ? `
              <form class="auth-form" data-auth-form>
                <label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" required placeholder="toi@exemple.com" /></label>
                <label class="field"><span>Mot de passe</span><input name="password" type="password" autocomplete="current-password" required minlength="6" placeholder="******" /></label>
                <label class="field"><span>Pseudo</span><input name="displayName" type="text" autocomplete="nickname" placeholder="Mathieu ou Quentin" /></label>
                <div class="auth-form__actions">
                  <button class="primary-button" type="submit" data-mode="login" ${busy ? 'disabled' : ''}>${svgIcon('logout')} Se connecter</button>
                  <button class="ghost-button" type="submit" data-mode="register" ${busy ? 'disabled' : ''}>${svgIcon('plus')} Créer un compte</button>
                </div>
              </form>
              <button class="google-button" type="button" data-action="google-login" ${busy ? 'disabled' : ''}>${svgIcon('google')} Continuer avec Google</button>
            `
            : `<div class="warning-banner">${svgIcon('warning')}<div><strong>Firebase non configuré</strong><p>Renseigne les variables VITE_FIREBASE_* dans ton .env local.</p></div></div>`
        }

        ${missingKeys?.length ? `<p class="config-hint">Clés manquantes: ${escapeHtml(missingKeys.join(', '))}</p>` : ''}
      </section>
    </div>
  `;
}

export function renderEditorModal({ bluray, mode, busy }) {
  const title = mode === 'edit' ? 'Modifier le Blu-ray' : 'Ajouter un Blu-ray';
  const submitLabel = mode === 'edit' ? 'Mettre à jour' : 'Enregistrer';
  return `
    <div class="modal-backdrop" data-close-overlay="true">
      <section class="modal glass modal--wide" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <header class="modal__header">
          <div><p class="eyebrow">Fiche Blu-ray</p><h3>${escapeHtml(title)}</h3></div>
          <button class="icon-button" type="button" data-action="close-modal" title="Fermer">${svgIcon('close')}</button>
        </header>

        <form class="editor-form" data-editor-form>
          <div class="editor-grid">
            <label class="field field--wide"><span>Titre *</span><input name="title" required value="${escapeHtml(bluray.title || '')}" /></label>
            <label class="field"><span>Saga</span><input name="saga" value="${escapeHtml(bluray.saga || '')}" /></label>
            <label class="field">
              <span>Genre *</span>
              <select name="genre" required>
                ${GENRE_OPTIONS.map((genre) => `<option value="${escapeHtml(genre)}" ${genre === bluray.genre ? 'selected' : ''}>${escapeHtml(genre)}</option>`).join('')}
              </select>
            </label>
            <label class="field"><span>Année</span><input name="year" type="number" min="1888" max="2100" value="${escapeHtml(bluray.year || '')}" /></label>
            <label class="field"><span>Réalisateur</span><input name="director" value="${escapeHtml(bluray.director || '')}" /></label>
            <label class="field">
              <span>Statut *</span>
              <select name="status" required>
                ${STATUS_OPTIONS.map((option) => `<option value="${escapeHtml(option)}" ${option === bluray.status ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
              </select>
            </label>
            <label class="field">
              <span>Propriétaire *</span>
              <select name="owner" required>
                ${OWNER_OPTIONS.map((option) => `<option value="${escapeHtml(option)}" ${option === bluray.owner ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
              </select>
            </label>
            <label class="field"><span>Emplacement</span><input name="location" value="${escapeHtml(bluray.location || '')}" /></label>
            <label class="field"><span>Code-barres</span><input name="barcode" value="${escapeHtml(bluray.barcode || '')}" /></label>
            <label class="field"><span>Note (0 à 5)</span><input name="rating" type="number" min="0" max="5" step="1" value="${escapeHtml(bluray.rating ?? 0)}" /></label>
            <label class="switch-field"><input name="watched" type="checkbox" ${bluray.watched ? 'checked' : ''} /><span>Déjà visualisé</span></label>
            <label class="switch-field"><input name="is3D" type="checkbox" ${bluray.is3D ? 'checked' : ''} /><span>Film en 3D</span></label>
            <label class="field field--wide"><span>Commentaire</span><textarea name="comment" rows="4">${escapeHtml(bluray.comment || '')}</textarea></label>
            <label class="field field--wide"><span>Jaquette</span><input name="cover" type="file" accept="image/*" /><small>L'image est compressée puis stockée dans Firestore.</small></label>
          </div>

          <div class="editor-form__actions">
            <button class="ghost-button" type="button" data-action="close-modal">${svgIcon('close')} Annuler</button>
            <button class="primary-button" type="submit" ${busy ? 'disabled' : ''}>${svgIcon('save')} ${escapeHtml(submitLabel)}</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

export function renderDetailModal({ bluray }) {
  if (!bluray) return '';

  const cover = bluray.coverImageUrl
    ? `<img src="${escapeHtml(bluray.coverImageUrl)}" alt="Jaquette de ${escapeHtml(bluray.title)}" />`
    : `<div class="detail-cover__placeholder">${svgIcon('image')}<span>Pas de jaquette</span></div>`;

  return `
    <div class="modal-backdrop" data-close-overlay="true">
      <section class="modal glass modal--detail" role="dialog" aria-modal="true" aria-label="Détail du Blu-ray">
        <header class="modal__header">
          <div><p class="eyebrow">Détail</p><h3>${escapeHtml(bluray.title || 'Sans titre')}</h3></div>
          <button class="icon-button" type="button" data-action="close-modal" title="Fermer">${svgIcon('close')}</button>
        </header>

        <div class="detail-layout">
          <div class="detail-cover">${cover}</div>
          <div class="detail-body">
            <div class="detail-tags">
              ${chip(bluray.genre || 'Genre inconnu', 'brand')}
              ${chip(statusLabel(bluray), bluray.watched ? 'success' : 'warning')}
              ${bluray.is3D ? chip('3D', 'brand') : ''}
              ${chip(bluray.owner || 'Commun', 'neutral')}
            </div>

            <dl class="detail-grid">
              ${renderDetailItem('Saga', bluray.saga)}
              ${renderDetailItem('Genre', bluray.genre)}
              ${renderDetailItem('Année', formatYear(bluray.year))}
              ${renderDetailItem('Réalisateur', bluray.director)}
              ${renderDetailItem('Statut', bluray.status)}
              ${renderDetailItem('Visualisé', bluray.watched ? 'Oui' : 'Non')}
              ${renderDetailItem('Film 3D', bluray.is3D ? 'Oui' : 'Non')}
              ${renderDetailItem('Propriétaire', bluray.owner)}
              ${renderDetailItem('Emplacement', bluray.location)}
              ${renderDetailItem('Code-barres', bluray.barcode)}
              ${renderDetailItem('Note', `${ratingStars(bluray.rating)} (${bluray.rating ?? 0}/5)`)}
              ${renderDetailItem('Ajouté le', formatDate(bluray.createdAt))}
              ${renderDetailItem('Modifié le', formatDateTime(bluray.updatedAt))}
            </dl>

            <div class="detail-comment"><p class="eyebrow">Commentaire</p><p>${escapeHtml(bluray.comment || 'Aucun commentaire.')}</p></div>
            <div class="detail-actions">
              <button class="ghost-button" type="button" data-action="edit" data-id="${escapeHtml(bluray.id)}">${svgIcon('edit')} Modifier</button>
              <button class="ghost-button danger" type="button" data-action="delete" data-id="${escapeHtml(bluray.id)}">${svgIcon('trash')} Supprimer</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderDetailItem(label, value) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || '—')}</dd></div>`;
}

export function renderToastStack(toasts) {
  return toasts
    .map(
      (toast) => `
        <div class="toast toast--${escapeHtml(toast.type || 'info')}">
          ${svgIcon(toast.type === 'error' ? 'warning' : toast.type === 'success' ? 'check' : 'app')}
          <div><strong>${escapeHtml(toast.title || 'Info')}</strong><p>${escapeHtml(toast.message || '')}</p></div>
        </div>
      `
    )
    .join('');
}

export function renderAppOverlays(state) {
  const route = state.route || { type: 'home' };
  const bluray = state.activeBluray || null;

  if (route.type === 'detail' && bluray) {
    return renderDetailModal({ bluray });
  }

  if (route.type === 'editor') {
    return renderEditorModal({
      bluray: state.editorBluray || {},
      mode: route.id === 'new' ? 'create' : 'edit',
      busy: state.busy,
    });
  }

  return '';
}
