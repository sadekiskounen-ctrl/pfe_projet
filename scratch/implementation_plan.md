# Correction Ergonomie Modales, Noms de Produits & Résolution Disgrâce (Renvoyer la marchandise)

Ce plan décrit les changements nécessaires pour :
1. Rendre les modales de l'Administration défilables (scrollables) lorsqu'elles dépassent la hauteur de l'écran, afin d'éviter le blocage de l'interface et de permettre d'atteindre le bouton de fermeture.
2. Corriger le libellé `"Article"` par le nom réel du produit (ex : `"airpods"`) dans les tableaux d'historique des réceptions (GR) côté Admin et Fournisseur en étendant le OData `$expand`.
3. Ajouter une action de résolution `"Renvoyer la marchandise"` côté Fournisseur pour annuler les pièces manquantes/rejetées, faire disparaître l'alerte critique et permettre la suite du processus normal (facturation & 3-Way Match).

---

## Proposed Changes

### [Backend Components]

#### [MODIFY] [srm-service.cds](file:///c:/Users/hicha/OneDrive/Bureau/pfe_projet-main/backend/srv/srm/srm-service.cds)
Déclarer l'action `resolveDiscrepancy` :
```cds
  action resolveDiscrepancy(poId: UUID) returns BonsCommande;
```

#### [MODIFY] [srm-service.js](file:///c:/Users/hicha/OneDrive/Bureau/pfe_projet-main/backend/srv/srm/srm-service.js)
Implémenter le handler de `resolveDiscrepancy` :
- Mettre à jour tous les `ReceptionItems` du PO en fixant `receivedQty = orderedQty`, `acceptedQty = orderedQty` et `rejectedQty = 0`.
- Mettre à jour `POItems.receivedQty` à la valeur de la quantité commandée.
- Retourner le bon de commande mis à jour.

---

### [Frontend Components - Admin React App]

#### [MODIFY] [index.css](file:///c:/Users/hicha/OneDrive/Bureau/pfe_projet-main/frontend-react/src/index.css)
Ajuster les styles de `.modal-overlay` pour permettre le défilement vertical si le contenu dépasse la hauteur d'affichage :
```css
.modal-overlay {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: none;
    align-items: flex-start; /* Permet le défilement fluide */
    justify-content: center;
    z-index: 2000;
    overflow-y: auto; /* Active le défilement */
    padding: 40px 0; /* Ajoute une marge agréable */
}
```

#### [MODIFY] [App.jsx](file:///c:/Users/hicha/OneDrive/Bureau/pfe_projet-main/frontend-react/src/App.jsx)
Modifier la requête de détails de commande pour expander le produit et l'item de commande d'origine à l'intérieur des réceptions :
`receptions($expand=items($expand=product,poItem))`

#### [MODIFY] [Commandes.jsx](file:///c:/Users/hicha/OneDrive/Bureau/pfe_projet-main/frontend-react/src/components/Commandes.jsx)
Modifier la cellule de description de l'article dans la table GR pour utiliser en priorité les informations expandées :
`gi.product?.name || gi.poItem?.description || gi.description || 'Article'`

---

### [Frontend Components - Supplier Portal]

#### [MODIFY] [index.html](file:///c:/Users/hicha/OneDrive/Bureau/pfe_projet-main/frontend/srm/index.html)
- **OData expand** : Dans `viewPO`, étendre le query à `receptions($expand=items($expand=product,poItem))`.
- **Rendu du nom de produit** : Calculer `desc` dans `viewPO` en extrayant `(gi.product && gi.product.name) || (gi.poItem && gi.poItem.description)`.
- **Bouton Renvoyer Marchandise** :
  - Ajouter un bouton "Renvoyer la marchandise (Résoudre l'écart)" dans l'encart d'alerte rouge du modal de détails du PO.
  - Ajouter ce bouton également sur la carte d'alerte critique du Tableau de bord.
- **Action JavaScript** : Ajouter la fonction globale `handleResolveDiscrepancy(poId)` pour appeler le backend, afficher un message de succès, fermer la modale et recharger le dashboard/la liste des POs.

---

## Verification Plan

### Automated Verification
- Lancer `npm test` pour s'assurer que l'intégration du OData et des nouvelles actions CDS n'introduit aucun bug.

### Manual Verification
1. Ouvrir le détail d'une commande livrée contenant des pièces rejetées (Admin). Vérifier qu'un ascenseur apparaît sur la modale si elle déborde de l'écran, permettant de scroller jusqu'au bas et de cliquer sur le bouton "Fermer".
2. Vérifier que la colonne "Description" du tableau GR affiche le nom exact de l'article (ex : `"airpods"`) à la place de `"Article"`, dans l'Admin et le Portail Fournisseur.
3. Côté Fournisseur, sur le Tableau de bord, cliquer sur "Renvoyer la marchandise" dans la boîte d'alerte. Vérifier que l'alerte critique disparaît du dashboard, que le badge rouge `⚠️ ÉCART DE RÉCEPTION` redevient vert `GR VALIDÉE ✓` et que le processus peut continuer (soumission de la facture et validation).
