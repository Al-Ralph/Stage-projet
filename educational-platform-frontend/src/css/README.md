# Organisation CSS - Plateforme Éducative

## Structure des fichiers CSS

### Fichiers principaux

1. **`global.css`** - Styles globaux et variables CSS
   - Variables CSS (couleurs, espacements, ombres, etc.)
   - Reset et styles de base
   - Animations principales
   - Classes utilitaires
   - Responsive design

2. **`animations.css`** - Animations centralisées
   - Toutes les animations communes (`spin`, `pulse`, `fadeIn`, etc.)
   - Évite les duplications entre fichiers

3. **`index.css`** - Styles de base minimalistes
   - Styles complémentaires à `global.css`
   - Pas de duplications avec `global.css`

4. **`App.css`** - Styles spécifiques à l'application principale
   - Styles pour le composant App
   - Pas de conflits avec `global.css`

### Fichiers par page/composant

- `Auth.css` - Styles pour l'authentification
- `Dashboard.css` - Styles pour le tableau de bord
- `Home.css` - Styles pour la page d'accueil
- `Profile.css` - Styles pour le profil utilisateur
- `Notifications.css` - Styles pour les notifications
- `Admin.css` - Styles pour l'interface d'administration
- `AIInsights.css` - Styles pour les insights IA
- `ApiGateway.css` - Styles pour la passerelle API
- `Layout.css` - Styles pour la mise en page

## Bonnes pratiques

### ✅ À faire

1. **Utiliser les variables CSS** définies dans `global.css`
   ```css
   color: var(--primary-color);
   background: var(--card-bg);
   border-radius: var(--border-radius-md);
   ```

2. **Importer les animations** depuis `animations.css`
   ```css
   .my-element {
     animation: fadeIn 0.6s ease-out;
   }
   ```

3. **Utiliser les classes utilitaires** de `global.css`
   ```css
   <div class="card hover-lift">
   <button class="btn btn-primary">
   ```

4. **Respecter la hiérarchie des z-index**
   ```css
   z-index: var(--z-modal);
   ```

### ❌ À éviter

1. **Dupliquer les animations** - Utiliser `animations.css`
2. **Redéfinir les variables CSS** - Utiliser celles de `global.css`
3. **Créer des conflits de largeur** - Respecter `width: 100%`
4. **Utiliser `!important`** sauf si absolument nécessaire
5. **Dupliquer les styles de base** - Utiliser `global.css`

## Ordre d'importation recommandé

```css
/* Dans le fichier principal */
@import './css/global.css';
@import './css/animations.css';
@import './css/index.css';
@import './css/App.css';
/* Puis les fichiers spécifiques */
```

## Résolution des problèmes courants

### Conflits de largeur
- Vérifier que `#root` et `.container-full` ont `width: 100%`
- Éviter les `max-width` fixes qui contredisent `global.css`

### Animations qui ne fonctionnent pas
- Vérifier que l'animation est définie dans `animations.css`
- S'assurer qu'il n'y a pas de duplications

### Styles qui ne s'appliquent pas
- Vérifier l'ordre d'importation des fichiers CSS
- Utiliser les variables CSS au lieu de valeurs codées en dur

## Maintenance

- Vérifier régulièrement les duplications avec `grep -r "@keyframes" src/css/`
- Maintenir la cohérence des variables CSS dans `global.css`
- Documenter les nouvelles animations dans `animations.css` 