package com.timecool.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Environment;
import android.provider.ContactsContract;
import android.provider.MediaStore;
import android.util.Base64;

import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;

import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import java.util.concurrent.Executors;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {

    private WebView webView;

    /** Callback du sélecteur de fichiers, le temps que l'utilisateur choisisse. */
    private ValueCallback<Uri[]> fileCallback;

    private static final int REQ_FICHIER = 1001;
    private static final int REQ_CONTACTS = 1002;
    private static final int REQ_LOCALISATION = 1003;
    private static final int REQ_EXPORT_FICHIER = 1004;

    /** Prompt de géolocalisation en attente d'une réponse à la permission runtime. */
    private String origineLocalisationEnAttente;
    private GeolocationPermissions.Callback callbackLocalisationEnAttente;

    /** Export de fichier en attente d'une réponse à la permission runtime (Android ≤ 9). */
    private String exportEnAttenteNom;
    private String exportEnAttenteContenu;
    private String exportEnAttenteMime;

    /*
     * Resultat Google en attente de livraison a la page.
     *
     * Statiques a dessein : pendant que le selecteur de comptes Google
     * occupe l'ecran, le systeme peut detruire puis recreer cette
     * activite. La WebView est alors reconstruite et rechargee depuis
     * zero — l'utilisateur revient a l'ecran d'accueil, et le callback
     * ecrirait dans une WebView qui n'existe plus : jeton perdu, aucun
     * message, aucun appel au serveur.
     *
     * En conservant le resultat hors de l'instance, il est livre des que
     * la page est prete, que ce soit la meme activite ou la suivante.
     */
    private static String jetonGoogleEnAttente = null;
    private static String erreurGoogleEnAttente = null;

    /**
     * Activite actuellement vivante.
     *
     * Indispensable : rendre seulement le jeton statique ne suffisait
     * pas. L'ancienne activite, detruite, conservait pagePrete a true et
     * sa vieille WebView ; elle consommait donc le jeton et l'ecrivait
     * dans le vide, et la nouvelle n'avait plus rien a livrer.
     * La livraison passe desormais par l'instance courante, jamais par
     * celle qui a recu le callback.
     */
    private static MainActivity instanceCourante = null;

    /** La page est-elle chargee et capable de recevoir un appel JS ? */
    private boolean pagePrete = false;

    /*
     * Identifiant client Google servant d'audience au jeton d'identite.
     * Credential Manager attend celui de type « Application Web », pas
     * celui de type « Android ». Doit rester identique a
     * google_client_ids dans config.php, qui verifie l'audience.
     */
    private static final String GOOGLE_CLIENT_ID =
        "696652298607-q4b7qk6qno95apbfp1fb8r3hnn48rv2o.apps.googleusercontent.com";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Plein écran sans barre de titre
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        // Cette instance devient celle qui recevra les livraisons.
        instanceCourante = this;

        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        // Sans ceci, onGeolocationPermissionsShowPrompt n'est jamais
        // déclenché : la WebView refuse silencieusement toute demande
        // navigator.geolocation, permission Android accordée ou non.
        settings.setGeolocationEnabled(true);

        // Pont natif : donne à la page l'accès au carnet d'adresses.
        webView.addJavascriptInterface(new PontNatif(), "TimeCoolNatif");

        // Conserve la navigation interne dans la WebView
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("file://")) {
                    return false;
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView vue, String url) {
                // La page est prete : on livre un eventuel resultat Google
                // arrive pendant qu'elle ne l'etait pas — cas typique d'une
                // activite recreee pendant le selecteur de comptes.
                pagePrete = true;
                livrerResultatGoogle();
            }
        });

        /*
         * Sans onShowFileChooser, l'implémentation par défaut renvoie false
         * et AUCUN sélecteur de fichier ne s'ouvre : tout <input type="file">
         * de la page reste inerte dans l'APK, sans erreur ni message.
         * C'est ce qui rendait « Importer mes clés » sans effet.
         */
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView vue,
                                             ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                // Un sélecteur déjà ouvert doit être clos, sinon son callback
                // resterait en attente indéfiniment.
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }
                fileCallback = callback;

                try {
                    Intent intent = params.createIntent();
                    startActivityForResult(intent, REQ_FICHIER);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }

            /*
             * Sans cet override, la WebView répond toujours "refusé" à
             * navigator.geolocation, même quand la permission Android est
             * déjà accordée : le prompt WebView est un préalable distinct
             * de la permission système, et les deux doivent être gérés.
             */
            @Override
            public void onGeolocationPermissionsShowPrompt(String origine,
                                                            GeolocationPermissions.Callback callback) {
                if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)
                        == PackageManager.PERMISSION_GRANTED
                    || checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION)
                        == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origine, true, false);
                    return;
                }
                // Un prompt déjà en attente doit être clos avant d'en ouvrir
                // un autre, sinon son callback resterait sans réponse.
                if (callbackLocalisationEnAttente != null) {
                    callbackLocalisationEnAttente.invoke(
                        origineLocalisationEnAttente, false, false);
                }
                origineLocalisationEnAttente = origine;
                callbackLocalisationEnAttente = callback;
                requestPermissions(
                    new String[] {
                        android.Manifest.permission.ACCESS_FINE_LOCATION,
                        android.Manifest.permission.ACCESS_COARSE_LOCATION
                    },
                    REQ_LOCALISATION
                );
            }
        });

        // Charge l'application depuis les assets
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onActivityResult(int requete, int resultat, Intent donnees) {
        if (requete == REQ_FICHIER) {
            if (fileCallback == null) {
                return;
            }
            Uri[] fichiers = null;
            if (resultat == Activity.RESULT_OK && donnees != null) {
                if (donnees.getClipData() != null) {
                    int n = donnees.getClipData().getItemCount();
                    fichiers = new Uri[n];
                    for (int i = 0; i < n; i++) {
                        fichiers[i] = donnees.getClipData().getItemAt(i).getUri();
                    }
                } else if (donnees.getData() != null) {
                    fichiers = new Uri[] { donnees.getData() };
                }
            }
            // Toujours répondre, y compris sur annulation : sans cela le
            // champ resterait bloqué et ne pourrait plus être réouvert.
            fileCallback.onReceiveValue(fichiers);
            fileCallback = null;
            return;
        }
        super.onActivityResult(requete, resultat, donnees);
    }

    @Override
    public void onRequestPermissionsResult(int requete, String[] permissions, int[] resultats) {
        if (requete == REQ_CONTACTS) {
            boolean accorde = resultats.length > 0
                && resultats[0] == PackageManager.PERMISSION_GRANTED;
            if (accorde) {
                envoyerContactsALaPage();
            } else {
                appelerJs("tcContactsRefuses", "");
            }
            return;
        }
        if (requete == REQ_LOCALISATION) {
            boolean accorde = false;
            for (int r : resultats) {
                if (r == PackageManager.PERMISSION_GRANTED) {
                    accorde = true;
                    break;
                }
            }
            if (callbackLocalisationEnAttente != null) {
                callbackLocalisationEnAttente.invoke(
                    origineLocalisationEnAttente, accorde, false);
                callbackLocalisationEnAttente = null;
                origineLocalisationEnAttente = null;
            }
            return;
        }
        if (requete == REQ_EXPORT_FICHIER) {
            boolean accorde = resultats.length > 0
                && resultats[0] == PackageManager.PERMISSION_GRANTED;
            boolean ok = accorde
                && ecrireFichierReellement(exportEnAttenteNom, exportEnAttenteContenu, exportEnAttenteMime);
            appelerJs("tcExportFichierResultat", ok ? "true" : "false");
            exportEnAttenteNom = null;
            exportEnAttenteContenu = null;
            exportEnAttenteMime = null;
            return;
        }
        super.onRequestPermissionsResult(requete, permissions, resultats);
    }

    /**
     * Livre à la page le résultat Google en attente, s'il y en a un et
     * si la page est prête. Sans effet dans le cas contraire : le
     * résultat reste en attente jusqu'au prochain onPageFinished.
     */
    private static void livrerResultatGoogle() {
        final MainActivity active = instanceCourante;
        // Aucune activite vivante : le resultat reste en attente et sera
        // livre par le onPageFinished de la prochaine.
        if (active == null) {
            return;
        }
        active.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (!active.pagePrete || active.webView == null) {
                    return;
                }
                if (jetonGoogleEnAttente != null) {
                    String jeton = jetonGoogleEnAttente;
                    jetonGoogleEnAttente = null;
                    active.appelerJs("tcGoogleJeton", jeton);
                } else if (erreurGoogleEnAttente != null) {
                    String err = erreurGoogleEnAttente;
                    erreurGoogleEnAttente = null;
                    active.appelerJs("tcGoogleErreur", err);
                }
            }
        });
    }

    /** Exécute une fonction JavaScript de la page, sur le thread UI. */
    private void appelerJs(final String fonction, final String argJson) {
        final String script = argJson.isEmpty()
            ? fonction + "()"
            : fonction + "(" + JSONObject.quote(argJson) + ")";
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                webView.evaluateJavascript(script, null);
            }
        });
    }

    /**
     * Lit le carnet d'adresses et le transmet à la page.
     * N'est appelé qu'une fois la permission accordée.
     */
    private void envoyerContactsALaPage() {
        JSONArray sortie = new JSONArray();
        Cursor c = null;
        try {
            c = getContentResolver().query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                new String[] {
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                    ContactsContract.CommonDataKinds.Phone.NUMBER
                },
                null, null,
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
            );
            if (c != null) {
                int iNom = c.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
                int iTel = c.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
                while (c.moveToNext()) {
                    String nom = iNom >= 0 ? c.getString(iNom) : null;
                    String tel = iTel >= 0 ? c.getString(iTel) : null;
                    if (nom == null || nom.trim().isEmpty()) {
                        continue;
                    }
                    JSONObject o = new JSONObject();
                    o.put("nom", nom.trim());
                    o.put("telephone", tel == null ? "" : tel.trim());
                    sortie.put(o);
                }
            }
        } catch (Exception e) {
            appelerJs("tcContactsErreur", e.getClass().getSimpleName());
            return;
        } finally {
            if (c != null) {
                c.close();
            }
        }
        appelerJs("tcContactsRecus", sortie.toString());
    }

    /**
     * Ouvre le sélecteur de comptes Google et transmet le jeton
     * d'identité à la page.
     *
     * Le jeton n'est PAS une preuve en soi côté application : c'est le
     * serveur qui vérifie sa signature contre les clés publiques de
     * Google. Ici on se contente de l'acheminer.
     */
    private void lancerConnexionGoogle() {
        /*
         * GetSignInWithGoogleOption et non GetGoogleIdOption : cette
         * connexion part d'un appui sur un bouton, donc d'un flux
         * explicite. GetGoogleIdOption vise l'affichage automatique en
         * feuille inférieure et renvoie « aucune information
         * d'identification » quand aucun compte n'est déjà autorisé pour
         * l'application — ce qui faisait échouer toute première connexion.
         */
        GetSignInWithGoogleOption option =
            new GetSignInWithGoogleOption.Builder(GOOGLE_CLIENT_ID).build();

        GetCredentialRequest requete = new GetCredentialRequest.Builder()
            .addCredentialOption(option)
            .build();

        CredentialManager gestionnaire = CredentialManager.create(this);
        gestionnaire.getCredentialAsync(
            this,
            requete,
            new CancellationSignal(),
            Executors.newSingleThreadExecutor(),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse reponse) {
                    try {
                        Credential id = reponse.getCredential();
                        if (id instanceof CustomCredential
                            && GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                                .equals(id.getType())) {
                            GoogleIdTokenCredential g =
                                GoogleIdTokenCredential.createFrom(((CustomCredential) id).getData());
                            // Depose puis livre : si la page n'est pas prete
                            // — activite recreee pendant le selecteur — le
                            // jeton attend au lieu d'etre perdu.
                            jetonGoogleEnAttente = g.getIdToken();
                        } else {
                            erreurGoogleEnAttente = "type_inattendu | " + id.getType();
                        }
                    } catch (Exception e) {
                        erreurGoogleEnAttente = e.getClass().getSimpleName()
                            + " | " + (e.getMessage() == null ? "(sans message)" : e.getMessage());
                    }
                    livrerResultatGoogle();
                }

                @Override
                public void onError(GetCredentialException e) {
                    /*
                     * Le seul nom de classe ne suffit pas a diagnostiquer :
                     * Credential Manager renvoie souvent NoCredential la ou
                     * le vrai probleme est une configuration incorrecte. On
                     * transmet donc aussi le type et le message.
                     * Couvre l'annulation par l'utilisateur, que la page
                     * traite sans afficher d'echec alarmant.
                     */
                    erreurGoogleEnAttente = e.getClass().getSimpleName()
                        + " | " + e.getType()
                        + " | " + (e.getMessage() == null ? "(sans message)" : e.getMessage());
                    livrerResultatGoogle();
                }
            }
        );
    }

    /**
     * Surface exposée à la page. Volontairement minimale : uniquement ce
     * dont l'application a besoin, rien de générique.
     */
    /*
     * Publique volontairement : addJavascriptInterface résout les méthodes
     * par réflexion, et l'invocation peut échouer sur une classe interne
     * privée. Le pont serait alors présent mais inopérant.
     */
    public class PontNatif {

        /** Permet à la page de savoir qu'elle tourne dans l'APK. */
        @JavascriptInterface
        public boolean estNatif() {
            return true;
        }

        /**
         * Version et horodatage du build réellement installé, pour que
         * la page ne les affiche jamais codés en dur — versionName et
         * BUILD_TIME viennent tous deux du CI (voir build.gradle et
         * build-apk.yml) et changent automatiquement à chaque publication.
         */
        @JavascriptInterface
        public String obtenirInfosVersion() {
            JSONObject infos = new JSONObject();
            try {
                infos.put("version", BuildConfig.VERSION_NAME);
                infos.put("versionCode", BuildConfig.VERSION_CODE);
                infos.put("buildTime", BuildConfig.BUILD_TIME);
            } catch (Exception e) {
                // JSONObject.put ne lève que sur une clé absente : ne peut pas arriver ici.
            }
            return infos.toString();
        }

        /**
         * Demande l'accès aux contacts, puis les transmet.
         * La page reçoit le résultat via tcContactsRecus / tcContactsRefuses.
         */
        /**
         * Lance la connexion Google. La page reçoit le résultat via
         * tcGoogleJeton ou tcGoogleErreur.
         */
        @JavascriptInterface
        public void connexionGoogle() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    lancerConnexionGoogle();
                }
            });
        }

        @JavascriptInterface
        public void demanderContacts() {
            if (checkSelfPermission(android.Manifest.permission.READ_CONTACTS)
                    == PackageManager.PERMISSION_GRANTED) {
                envoyerContactsALaPage();
            } else {
                requestPermissions(
                    new String[] { android.Manifest.permission.READ_CONTACTS },
                    REQ_CONTACTS
                );
            }
        }

        /**
         * Écrit réellement un fichier dans le dossier Téléchargements et
         * livre le résultat à la page via tcExportFichierResultat.
         *
         * Avant ce pont, "Sauvegarder mes clés" reposait sur <a download>
         * pointant vers une URL blob: — un mécanisme purement navigateur.
         * Dans la WebView, aucun DownloadListener n'était enregistré et
         * WebView ne sait de toute façon pas résoudre un blob: en dehors
         * d'un vrai navigateur : le clic ne déclenchait donc AUCUNE
         * écriture, mais le message de succès s'affichait quand même —
         * il ne dépendait que du clic JS, jamais d'une confirmation réelle.
         */
        @JavascriptInterface
        public void ecrireFichierTelechargement(final String nomFichier,
                                                 final String contenuBase64,
                                                 final String mime) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
                            && checkSelfPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE)
                                != PackageManager.PERMISSION_GRANTED) {
                        exportEnAttenteNom = nomFichier;
                        exportEnAttenteContenu = contenuBase64;
                        exportEnAttenteMime = mime;
                        requestPermissions(
                            new String[] { android.Manifest.permission.WRITE_EXTERNAL_STORAGE },
                            REQ_EXPORT_FICHIER
                        );
                        return;
                    }
                    boolean ok = ecrireFichierReellement(nomFichier, contenuBase64, mime);
                    appelerJs("tcExportFichierResultat", ok ? "true" : "false");
                }
            });
        }
    }

    /**
     * Décode le contenu base64 et l'écrit dans le dossier public
     * Téléchargements. À partir d'Android 10 (Q), via MediaStore — aucune
     * permission requise. En dessous, écriture directe dans le dossier
     * public (permission déjà vérifiée par l'appelant).
     */
    private boolean ecrireFichierReellement(String nomFichier, String contenuBase64, String mime) {
        byte[] donnees;
        try {
            donnees = Base64.decode(contenuBase64, Base64.DEFAULT);
        } catch (Exception e) {
            return false;
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues valeurs = new ContentValues();
                valeurs.put(MediaStore.Downloads.DISPLAY_NAME, nomFichier);
                valeurs.put(MediaStore.Downloads.MIME_TYPE, mime);
                valeurs.put(MediaStore.Downloads.IS_PENDING, 1);
                Uri uri = getContentResolver().insert(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI, valeurs);
                if (uri == null) {
                    return false;
                }
                try (OutputStream sortie = getContentResolver().openOutputStream(uri)) {
                    if (sortie == null) {
                        return false;
                    }
                    sortie.write(donnees);
                }
                valeurs.clear();
                valeurs.put(MediaStore.Downloads.IS_PENDING, 0);
                getContentResolver().update(uri, valeurs, null, null);
                return true;
            } else {
                File dossier = Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_DOWNLOADS);
                if (!dossier.exists() && !dossier.mkdirs()) {
                    return false;
                }
                File fichier = new File(dossier, nomFichier);
                try (FileOutputStream sortie = new FileOutputStream(fichier)) {
                    sortie.write(donnees);
                }
                return true;
            }
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    protected void onDestroy() {
        // Sans cette liberation, la reference statique retiendrait
        // l'activite detruite en memoire.
        if (instanceCourante == this) {
            instanceCourante = null;
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }
}
