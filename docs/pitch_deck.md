# Pitch Deck Script - DataFlow Canvas Demo

## 1. SCRIPT DE DÉMO (3-5 minutes)

**[Accroche - Problème]**
"Vous savez ce qui est vraiment frustrant quand on travaille sur des pipelines de données ? Ce n'est pas écrire le code, c'est passer des heures à débugger parce qu'on a oublié une jointure, ou qu'on s'est trompé dans un filtre, et qu'on ne le voit qu'en production. Ou pire : expliquer à un PM pourquoi ça prend 2 semaines alors qu'il pensait que c'était une journée de travail."

**[Transition - Solution]**
"Ce qu'il nous faut, c'est un moyen de voir ce qu'on est en train de construire, en temps réel, comme on dessinerait un schéma sur un tableau blanc. C'est exactement ce que fait DataFlow Canvas."

**[Démo - Mouvement clé 1: Créer un nœud]**
"Regardez : je commence avec une source de données simple - disons, notre table clients. Je glisse un nœud depuis la palette, je le connecte, et là..." *[clique sur le nœud source]* "...je vois immédiatement un aperçu des données : 10 000 lignes, les colonnes, même quelques valeurs aberrantes. Pas besoin de courir un query séparé."

**[Démo - Mouvement clé 2: Transformer les données]**
"Maintenant, je veux nettoyer ces données. J'ajoute un nœud de filtrage pour enlever les valeurs nulles sur l'email." *[glisse et connecte un nœud filter]* "Je configure rapidement le filtre..." *[clique sur le nœud filter pour montrer l'interface de config]* "...et boom, je vois en temps réel l'impact : on passe de 10 000 à 8 500 lignes. Si je me trompe, je le vois tout de suite, pas demain en test."

**[Démo - Mouvement clé 3: Joindre et prévisualiser]**
"Ensuite, je dois joindre avec notre table commandes pour calculer la valeur client." *[ajoute un nœud join et connecte les deux tables]* "Je définis la jointure sur customer_id..." *[clique sur le nœud join]* "...et je vois immédiatement un aperçu du résultat joint. Je peux même explorer quelques lignes pour vérifier que la logique est correcte avant d'écrire une seule ligne de SQL."

**[Démo - Mouvement clé 4: Modifier à la volée]"
"Attendez, je réalise que je devrais aussi inclure la date de première commande pour calculer l'ancienneté." *[ajoute un nœud computed field]* "Au lieu de retourner au code, je crée juste un nouveau champ directement ici : date de première commande moins date d'inscription." *[configure le champ]* "Et je vois le résultat apparaître immédiatement dans l'aperçu."

**[Preuve d'impact]**
"Le vrai gain ? Quand je suis satisfait, je clique sur 'Exporter' et j'obtiens du SQL production-ready, ou du Python si je préfère travailler avec Pandas." *[clique sur export]* "Pas de traduction manuelle, pas de perte en chemin. Ce que vous voyez ici, c'est exactement ce qui sera exécuté."

"Pour une équipe data, ça veut dire réduire le temps de développement de pipelines de 50% minimum, éliminer les aller-retours entre dev et test, et avoir enfin une documentation vivante qui reste synchronisée avec le code."

**[Call-to-action]**
"Si vous voulez voir comment ça fonctionne avec vos propres données, on peut prendre 15 minutes cette semaine pour construire un petit pipeline ensemble. Aucun engagement, juste pour voir si ça vous fait gagner du temps. Ça vous dit ?"

---

## 2. 3 PITCHS COURTS (1 phrase chacun)

**Pour un CTO technique :**  
"DataFlow Canvas réduit de moitié le temps de débogage des pipelines en rendant les transformations de données visibles et testables en temps réel, avant même d'exécuter une ligne de code."

**Pour un PO/PM non-technique :**  
"Enfin un outil qui permet de voir exactement ce que construit l'équipe data, comme un schéma de flux, pour comprendre les délais et les dépendances sans avoir besoin de connaissances techniques."

**Pour un startup founder :**  
"Passez de l'idée à la production en données en jours au lieu de semaines en éliminant les allers-retours mystérieux entre l'analyse et l'implémentation."

---

## 3. 3 POSTS LINKEDIN READY

**Post 1 : "Le problème invisible des pipelines de données"**  
🚨 Le problème invisible des pipelines de données  
On parle toujours du volume, de la vélocité, de la variété...  
Mais personne ne parle du vrai tueur de productivité : le temps passé à débugger ce qu'on ne voit pas.  
Vous avez déjà passé 3 heures à chercher pourquoi un join ne retournait rien, pour découvrir qu'un espace en trop dans une chaîne cassait tout ?  
C'est pas du travail de data, c'est du travail de détective.  
Et si on pouvait voir nos transformations de données en temps réel, comme on dessinerait un schéma ?  
#DataEngineering #DataPipeline #Productivité

**Post 2 : "J'ai construit un outil qui..."**  
💡 J'ai construit un outil qui transforme la façon dont les équipes data travaillent.  
Au lieu d'écrire du SQL dans l'ombre et de prier pour que ça marche en test,  
les data engineers peuvent maintenant :  
- glisser-déposer des nœuds de transformation  
- voir immédiatement un aperçu des données à chaque étape  
- modifier à la volée et voir l'impact en temps réel  
- exporter du SQL production-ready en un clic  
C'est pas de la magie, c'est juste ce que devrait être travailler avec des données : visible, immédiat, collaboratif.  
Qui veut essayer ?  
#DataFlow #ETL #DataTeams #Innovation

**Post 3 : "Pourquoi 80% des projets data échouent"**  
📊 Pourquoi 80% des projets data échouent (et ce n'est pas pour la raison qu'on pense)  
Pas à cause de la qualité des données.  
Pas à cause du manque de compétences.  
Mais parce que personne ne voit ce qui est en train d'être construit jusqu'à ce que ce soit trop tard.  
Les données restent une boîte noire : on entre des besoins, on espère sortir des insights,  
mais le processus intermédiaire est invisible, sujet à des interprétations différentes,  
et impossible à suivre en temps réel.  
DataFlow Canvas change ça en rendant le pipeline de données aussi visible qu'un schéma sur un tableau blanc.  
Quand tout le monde voit la même chose, les erreurs sont attrapées tôt,  
les estimations deviennent réalistes,  
et la confiance revient.  
Parce qu'en data, ce qu'on ne voit pas nous coûte cher.  
#DataProjects #DataManagement #BusinessIntelligence #Transparence