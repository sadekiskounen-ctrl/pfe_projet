# 🧪 Guide de Test & Évaluation — Validation des Fonctionnalités
> **À l'attention de l'Enseignant / Évaluateur**
> *Ce guide vous accompagne pas à pas pour tester et valider l'ensemble des fonctionnalités clés de notre plateforme SaaS (CRM, SRM, Administration & IA).*

---

## 🔑 1. Accès rapides & Informations de Connexion

L'application est configurée pour fonctionner avec des comptes prédéfinis représentant les différents acteurs de la PME.

* **URL du Portail Principal (React Dashboard)** : `http://localhost:5173` (ou l'URL locale configurée sur votre machine)
* **URL des Services OData (Backend CAP)** : `http://localhost:4004`

### Identifiants à utiliser pour vos tests :
Vous pouvez vous connecter avec les identifiants simplifiés suivants (saisir le login dans le champ email/login et le mot de passe correspondant) :

| Profil à tester | Identifiant / Login | Mot de passe | Rôle & Droits d'Accès |
| :--- | :--- | :--- | :--- |
| **Administrateur** | `admin` | `admin` | Accès à tout le portail React, KPI, validation de KYC, 3-Way Match, extracteur IA. |
| **Commercial** | `commercial` | `commercial` | Gestion des ventes, modification des devis clients. |
| **Fournisseur** | `fournisseur` | `fournisseur` | Réponses aux appels d'offres, acceptation de bons de commande, facturation. |
| **Client B2B** | `client` | `client` | Dépôt de demandes de devis, consultation de factures. |

---

## 📂 2. Scénario de Test 1 : Inscription Publique & Onboarding (KYC)
*Objectif : Valider l'auto-onboarding d'un nouveau partenaire et le contrôle administratif des pièces justificatives.*

1. Déconnectez-vous et rendez-vous sur la page publique d'**Inscription / Enregistrement**.
2. Remplissez le formulaire en choisissant le type **Fournisseur** ou **Client B2B** (entrez un faux NIF à 15 chiffres, un numéro de RC, un RIB à 24 chiffres).
3. Téléchargez des documents de test (PDF ou Image) pour le Registre du Commerce et le NIF.
4. Soumettez le formulaire. Le système vous indique que votre demande est en cours d'examen.
5. Connectez-vous maintenant en tant qu'**Administrateur** (`admin` / `admin`).
6. Allez sur l'onglet **Inscriptions** (dans la barre latérale). Vous verrez la demande d'inscription que vous venez de faire au statut *PENDING*.
7. Cliquez sur la ligne. Une interface en **vue partagée (Split-view)** s'ouvre :
   - À gauche, vous pouvez visualiser en temps réel les documents importés par le candidat (PDF ou image).
   - À droite, vous examinez ses coordonnées.
8. Cliquez sur **Approuver** (ou saisissez un motif et cliquez sur *Rejeter*).
   * **Vérification** : Une fois approuvé, le compte est créé et automatiquement synchronisé dans l'onglet **Clients** ou **Fournisseurs** en tant que partenaire d'affaires actif (*ACTIVE*).

---

## 🛒 3. Scénario de Test 2 : Le Cycle CRM & Ventes B2B
*Objectif : Valider le flux commercial depuis le devis jusqu'à l'encaissement.*

1. Connectez-vous en tant que **Client B2B** (`client` / `client`) ou simulez-le.
2. Allez dans le catalogue, ajoutez des articles au panier et cliquez sur **Soumettre le panier en tant que demande de Devis**.
3. Reconnectez-vous en tant que **Commercial** (`commercial` / `commercial`) ou **Admin** :
   - Allez sur l'onglet **Devis**. Vous y trouverez le devis au statut *PENDING*.
   - Ouvrez-le et appliquez une **remise globale** (ex: 10%) ou modifiez les prix unitaires de certaines lignes. Cliquez sur **Valider et envoyer au client**.
4. Reprenez le rôle du **Client B2B** :
   - Allez dans vos Devis, vous verrez l'offre commerciale révisée.
   - Cliquez sur **Accepter le devis**. Le statut passe à *CONFIRMED* et le système génère instantanément la **Commande Client (Sales Order)**.
5. De retour sur le profil **Commercial / Admin** :
   - Allez dans l'onglet **Commandes**. Cliquez sur la commande générée et faites **Convertir en Facture**.
   - Allez sur l'onglet **Factures**. Cliquez sur la facture client créée et sélectionnez l'action **Enregistrer un paiement**. Choisissez le mode (ex: Espèces ou Virement) et saisissez le montant total.
   * **Vérification** : La facture passe au statut **PAID** (Payée) et le montant restant à payer devient égal à 0.

---

## 🤖 4. Scénario de Test 3 : L'Innovation IA — Extracteur de Facture (Gemini)
*Objectif : Valider l'extraction automatisée d'une facture d'achat par intelligence artificielle.*

1. Connectez-vous en tant qu'**Administrateur** (`admin` / `admin`).
2. Allez sur l'onglet **Factures** et cliquez sur le bouton 🤖 **Extracteur IA**.
3. Dans la zone de dépôt, glissez-déposez une facture d'achat de votre choix (un fichier PDF ou une image PNG/JPG de facture réelle ou simulée).
4. Cliquez sur **Analyser par l'IA**.
5. Observez l'analyse en temps réel (l'IA Gemini lit le document en arrière-plan) :
   - À la fin de l'analyse, l'écran bascule en vue scindée.
   - Le système affiche la facture à gauche et le formulaire pré-rempli à droite.
   - **Champs extraits automatiquement par l'IA** : Numéro de facture, date, NIF, Registre du commerce, RIB bancaire, montant HT, TVA, TTC, ainsi que chaque ligne d'article avec les quantités et prix.
6. **Contrôlez l'appariement automatique (Matching)** :
   - Le système tente de faire correspondre le NIF ou le RC extrait avec vos fournisseurs en base de données.
   - Si le fournisseur n'existe pas, un message s'affiche et vous propose de **Créer automatiquement le fournisseur** à la volée en un seul clic !
7. Complétez la validation et cliquez sur **Confirmer**. La facture d'achat est enregistrée en base de données sans aucune saisie manuelle.

---

## 🔄 5. Scénario de Test 4 : Le 3-Way Match & Gestion des Litiges SRM
*Objectif : Tester le rapprochement à trois facteurs (Bon de commande ↔ Réception ↔ Facture) et la résolution de litiges.*

### A. Initialisation de la commande d'achat :
1. En tant qu'**Admin**, allez sur l'onglet **RFQ** (Appels d'offres). Créez un appel d'offres pour un produit (ex: 20 ordinateurs).
2. Connectez-vous en **Fournisseur** (`fournisseur` / `fournisseur`) :
   - Allez sur l'onglet RFQ, ouvrez l'appel d'offres et soumettez une offre financière (saisissez vos prix et délais).
3. Repassez en **Admin** :
   - Allez sur l'appel d'offres, sélectionnez l'offre du fournisseur comme étant l'offre gagnante.
   - Cliquez sur **Convertir en Bon de Commande (PO)**.
4. Côté **Fournisseur** : allez dans vos bons de commande et cliquez sur **Accepter la commande**.

### B. Contrôle de réception & Détection d'anomalie :
1. En tant qu'**Admin**, le camion de livraison arrive. Allez sur le Bon de commande (au statut *CONFIRMED*) et cliquez sur **Créer un bon de réception (GR)**.
2. Pour tester la détection d'écart :
   - Indiquez que vous avez commandé 20 unités, mais n'en acceptez que **15** (saisissez 15 dans la case quantité acceptée et **5** dans la case quantité rejetée pour cause de casse/défaut). Cliquez sur valider.
   * **Vérification** : Un e-mail d'alerte automatique de non-conformité est immédiatement envoyé au fournisseur avec le récapitulatif détaillé des pièces manquantes/rejetées.

### C. Résolution du litige logistique :
1. Côté **Fournisseur** :
   - Allez sur le Bon de commande. Le système indique qu'un écart a été constaté.
   - Renvoyez les pièces manquantes en renseignant la quantité réexpédiée (`5` unités) dans le champ de résolution. Soumettez. Le statut passe à *TO_APPROVE*.
2. Côté **Admin** :
   - Une alerte apparaît sur votre tableau de bord. Allez sur le Bon de commande et validez la nouvelle réception conforme. Le statut du PO passe à *DELIVERED*.

### D. Validation de la facture & 3-Way Match :
1. Côté **Fournisseur** : Générez la facture pour les 20 ordinateurs.
2. Côté **Admin** (ou via l'extracteur IA) :
   - À l'enregistrement de la facture d'achat, le système lance le **3-Way Match**.
   - Si les quantités facturées correspondent aux quantités réceptionnées et validées (20 unités) et que les prix correspondent aux tarifs négociés, la facture est marquée **MATCHED** et approuvée pour paiement.
   - *Pour tester l'écart de facturation* : Créez une facture avec un prix unitaire supérieur au prix négocié sur le PO. Le système bloquera automatiquement la facture avec le statut **DISCREPANCY** (Litige) et affichera une alerte sur le dashboard de l'administrateur.

---

## 📊 6. Scénario de Test 6 : Tableaux de Bord, KPI & Pistes d'Audit
*Objectif : Valider le suivi financier en temps réel et la conformité administrative.*

1. Connectez-vous en tant qu'**Administrateur** (`admin` / `admin`).
2. Rendez-vous sur la page **Vue d'ensemble** (Overview) :
   - Observez le chiffre d'affaires recalculé automatiquement en fonction de vos ventes.
   - Visualisez les **Encours Clients** qui représentent les factures clients impayées (crucial pour le suivi de la trésorerie).
   - Regardez le graphique des revenus journaliers.
   - Examinez les **Alertes** en haut de page (les notifications de stock critique si le stock d'un produit est inférieur à son seuil minimal, ou les factures en litige).
3. Allez sur l'onglet **Paramètres / Audit** :
   - Consultez la section **Audit Logs**. Vous y trouverez l'historique complet et immuable de toutes les actions que vous venez d'effectuer au cours de vos tests (ex: *"Approbation KYC de l'entreprise X"*, *"Validation du paiement de la facture Y"*), avec l'horodatage exact et le nom de l'utilisateur qui a fait l'action.

---
*Ce protocole simple permettra à votre professeur de tester l'application comme un auditeur professionnel et d'apprécier la profondeur technique de votre travail.*
