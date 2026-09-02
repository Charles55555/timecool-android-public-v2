package com.timecool.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Environment;
import android.provider.ContactsContract;
import android.provider.MediaStore;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import androidx.credentials.CreateCredentialResponse;
import androidx.credentials.CreatePasswordRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.CreateCredentialException;
import androidx.credentials.exceptions.GetCredentialException;

import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import java.util.concurrent.Executors;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
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
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

public class MainActivity extends Activity {

    private WebView webView;

    /** Callback du sélecteur de fichiers, le temps que l'utilisateur choisisse. */
    private ValueCallback<Uri[]> fileCallback;

    private static final int REQ_FICHIER = 1001;
    private static final int REQ_CONTACTS = 1002;
    private static final int REQ_LOCALISATION = 1003;
    private static final int REQ_EXPORT_FICHIER = 1004;
    private static final int REQ_CAMERA = 1005;

    /** Demande de camera venue de la WebView, en attente de la reponse Android. */
    private PermissionRequest requeteCameraEnAttente;

    /** Prompt de géolocalisation en attente d'une réponse à la permission runtime. */
    private String origineLocalisationEnAttente;
    private GeolocationPermissions.Callback callbackLocalisationEnAttente;

    /** Export de fichier en attente d'une réponse à la permission runtime (Android ≤ 9). */
    private String exportEnAttenteNom;
    private String exportEnAttenteContenu;
    private String exportEnAttenteMime;

    /** Alias de la clé Keystore protégeant le jeton de session pour la connexion biométrique. */
    private static final String ALIAS_CLE_BIOMETRIE = "timecool_biometrie_jeton";
    private static final String PREFS_BIOMETRIE = "timecool_biometrie";

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
             * Sans cet override, la WebView refuse toute demande de camera
             * de la page : getUserMedia echoue silencieusement et le
             * scanner de QR reste noir, sans erreur exploitable.
             *
             * Deux autorisations distinctes sont necessaires : celle
             * d'Android (permission systeme) et celle de la WebView. On
             * n'accorde la seconde qu'une fois la premiere obtenue.
             */
            @Override
            public void onPermissionRequest(final PermissionRequest requete) {
                boolean veutCamera = false;
                for (String r : requete.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) {
                        veutCamera = true;
                        break;
                    }
                }
                if (!veutCamera) {
                    requete.deny();
                    return;
                }
                if (checkSelfPermission(android.Manifest.permission.CAMERA)
                        == PackageManager.PERMISSION_GRANTED) {
                    requete.grant(new String[] { PermissionRequest.RESOURCE_VIDEO_CAPTURE });
                    return;
                }
                // Une demande deja en attente doit etre refusee avant d'en
                // ouvrir une autre, sinon son callback resterait sans reponse.
                if (requeteCameraEnAttente != null) {
                    requeteCameraEnAttente.deny();
                }
                requeteCameraEnAttente = requete;
                requestPermissions(
                    new String[] { android.Manifest.permission.CAMERA },
                    REQ_CAMERA
                );
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
        if (requete == REQ_CAMERA) {
            boolean accorde = resultats.length > 0
                && resultats[0] == PackageManager.PERMISSION_GRANTED;
            if (requeteCameraEnAttente != null) {
                if (accorde) {
                    requeteCameraEnAttente.grant(
                        new String[] { PermissionRequest.RESOURCE_VIDEO_CAPTURE });
                } else {
                    // Toujours repondre, y compris sur refus : sans cela la
                    // page attendrait indefiniment un flux qui ne viendra pas.
                    requeteCameraEnAttente.deny();
                }
                requeteCameraEnAttente = null;
            }
            if (!accorde) {
                appelerJs(tcCameraRefusee, );
            }
            return;
        }
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

        /**
         * Propose d'enregistrer l'identifiant et le mot de passe dans le
         * gestionnaire d'identifiants système — même bibliothèque que la
         * connexion Google (Credential Manager), mais CreatePasswordRequest
         * plutôt que GetCredentialRequest : on y dépose un identifiant au
         * lieu d'y en lire un.
         *
         * Purement une proposition à l'utilisateur, portée par la boîte
         * système elle-même : un refus, une fermeture ou une erreur n'a
         * aucune conséquence applicative, la connexion a déjà réussi avant
         * cet appel. Rien n'est donc remonté à la page dans ces cas.
         */
        @JavascriptInterface
        public void enregistrerIdentifiants(final String identifiant, final String motDePasse) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    CreatePasswordRequest requete = new CreatePasswordRequest(identifiant, motDePasse);
                    CredentialManager gestionnaire = CredentialManager.create(MainActivity.this);
                    gestionnaire.createCredentialAsync(
                        MainActivity.this,
                        requete,
                        new CancellationSignal(),
                        Executors.newSingleThreadExecutor(),
                        new CredentialManagerCallback<CreateCredentialResponse, CreateCredentialException>() {
                            @Override
                            public void onResult(CreateCredentialResponse reponse) {
                                // Rien à faire : la boîte système a déjà tout géré.
                            }

                            @Override
                            public void onError(CreateCredentialException e) {
                                // Refus, fermeture ou absence de gestionnaire compatible —
                                // pas une erreur applicative, rien à signaler à la page.
                            }
                        }
                    );
                }
            });
        }

        /**
         * La connexion biométrique repose sur android.hardware.biometrics.*
         * et android.security.keystore.*, absentes avant Android 11 (API 30) —
         * voir BiometrieR ci-dessous pour pourquoi ce contrôle doit rester
         * ici plutôt que dans la classe qui les utilise réellement.
         */
        @JavascriptInterface
        public boolean biometrieDisponible() {
            return Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && BiometrieR.disponible(MainActivity.this);
        }

        @JavascriptInterface
        public void activerBiometrie(final String jeton) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
                appelerJs("tcBiometrieActivation", "false");
                return;
            }
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    BiometrieR.activer(MainActivity.this, jeton);
                }
            });
        }

        @JavascriptInterface
        public void desactiverBiometrie() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                BiometrieR.desactiver(MainActivity.this);
            }
        }

        @JavascriptInterface
        public void deverrouillerBiometrie() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
                appelerJs("tcBiometrieEchec", "");
                return;
            }
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    BiometrieR.deverrouiller(MainActivity.this);
                }
            });
        }
    }

    /**
     * Regroupe tout ce qui touche à android.hardware.biometrics.* et
     * android.security.keystore.* — classes absentes avant Android 11
     * (API 30), qui casseraient le chargement de l'application sur un
     * appareil plus ancien si elles étaient référencées directement
     * dans PontNatif : le vérificateur de classes d'Android peut
     * résoudre les classes référencées par une méthode même sur un
     * chemin jamais emprunté. Isolées dans leur propre classe, elles ne
     * sont chargées que si cette classe l'est elle-même — jamais avant
     * le contrôle Build.VERSION.SDK_INT fait par chaque appelant.
     *
     * Le jeton de session (pas le mot de passe) est chiffré par une clé
     * conservée dans l'Android Keystore, configurée pour n'être
     * utilisable qu'après une authentification biométrique fraîche
     * (setUserAuthenticationRequired + setUserAuthenticationParameters).
     * Le déchiffrement, donc la reconnexion, n'est ainsi possible qu'en
     * repassant par une empreinte ou un visage reconnu par le capteur —
     * jamais en lisant simplement le fichier de préférences.
     */
    private static final class BiometrieR {

        static boolean disponible(Context contexte) {
            BiometricManager gestionnaire = contexte.getSystemService(BiometricManager.class);
            if (gestionnaire == null) {
                return false;
            }
            return gestionnaire.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                == BiometricManager.BIOMETRIC_SUCCESS;
        }

        private static SecretKey obtenirOuCreerCle() throws Exception {
            KeyStore magasin = KeyStore.getInstance("AndroidKeyStore");
            magasin.load(null);
            if (magasin.containsAlias(ALIAS_CLE_BIOMETRIE)) {
                return (SecretKey) magasin.getKey(ALIAS_CLE_BIOMETRIE, null);
            }
            KeyGenParameterSpec spec = new KeyGenParameterSpec.Builder(
                    ALIAS_CLE_BIOMETRIE,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setUserAuthenticationRequired(true)
                .setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG)
                .build();
            KeyGenerator generateur = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generateur.init(spec);
            return generateur.generateKey();
        }

        /**
         * Premier réglage : authentifie, puis chiffre et dépose le jeton
         * fourni. Répondu à la page via tcBiometrieActivation(true|false).
         */
        static void activer(final MainActivity activite, final String jeton) {
            try {
                SecretKey cle = obtenirOuCreerCle();
                final Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                cipher.init(Cipher.ENCRYPT_MODE, cle);

                BiometricPrompt.Builder builder = new BiometricPrompt.Builder(activite)
                    .setTitle("Activer la connexion biométrique")
                    .setSubtitle("Confirme ton identité pour protéger ta prochaine connexion rapide")
                    .setNegativeButton("Annuler", activite.getMainExecutor(), new android.content.DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(android.content.DialogInterface dialogue, int bouton) {
                            activite.appelerJs("tcBiometrieActivation", "false");
                        }
                    })
                    .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG);

                builder.build().authenticate(
                    new BiometricPrompt.CryptoObject(cipher),
                    new CancellationSignal(),
                    activite.getMainExecutor(),
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult resultat) {
                            try {
                                Cipher c = resultat.getCryptoObject().getCipher();
                                byte[] chiffre = c.doFinal(jeton.getBytes("UTF-8"));
                                byte[] iv = c.getIV();
                                SharedPreferences prefs = activite.getSharedPreferences(PREFS_BIOMETRIE, Context.MODE_PRIVATE);
                                prefs.edit()
                                    .putString("jeton_chiffre", Base64.encodeToString(chiffre, Base64.NO_WRAP))
                                    .putString("iv", Base64.encodeToString(iv, Base64.NO_WRAP))
                                    .apply();
                                activite.appelerJs("tcBiometrieActivation", "true");
                            } catch (Exception e) {
                                activite.appelerJs("tcBiometrieActivation", "false");
                            }
                        }

                        @Override
                        public void onAuthenticationError(int codeErreur, CharSequence messageErreur) {
                            activite.appelerJs("tcBiometrieActivation", "false");
                        }

                        @Override
                        public void onAuthenticationFailed() {
                            // Empreinte non reconnue : le prompt système reste ouvert
                            // pour un nouvel essai, rien à faire ici.
                        }
                    }
                );
            } catch (Exception e) {
                activite.appelerJs("tcBiometrieActivation", "false");
            }
        }

        /** Synchrone et sans prompt : supprime la clé et le jeton chiffré déposé. */
        static void desactiver(MainActivity activite) {
            try {
                KeyStore magasin = KeyStore.getInstance("AndroidKeyStore");
                magasin.load(null);
                if (magasin.containsAlias(ALIAS_CLE_BIOMETRIE)) {
                    magasin.deleteEntry(ALIAS_CLE_BIOMETRIE);
                }
            } catch (Exception e) {
                // Au pire la clé orpheline sera simplement recréée à la prochaine activation.
            }
            activite.getSharedPreferences(PREFS_BIOMETRIE, Context.MODE_PRIVATE).edit().clear().apply();
        }

        /**
         * Authentifie puis déchiffre le jeton déposé lors de activer().
         * Répond via tcBiometrieDeverrouille(jeton) ou tcBiometrieEchec().
         */
        static void deverrouiller(final MainActivity activite) {
            SharedPreferences prefs = activite.getSharedPreferences(PREFS_BIOMETRIE, Context.MODE_PRIVATE);
            final String jetonChiffreB64 = prefs.getString("jeton_chiffre", null);
            String ivB64 = prefs.getString("iv", null);
            if (jetonChiffreB64 == null || ivB64 == null) {
                activite.appelerJs("tcBiometrieEchec", "");
                return;
            }
            try {
                SecretKey cle = obtenirOuCreerCle();
                byte[] iv = Base64.decode(ivB64, Base64.NO_WRAP);
                final Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                cipher.init(Cipher.DECRYPT_MODE, cle, new GCMParameterSpec(128, iv));

                BiometricPrompt.Builder builder = new BiometricPrompt.Builder(activite)
                    .setTitle("Déverrouiller TimeCool")
                    .setSubtitle("Confirme ton identité pour te reconnecter")
                    .setNegativeButton("Annuler", activite.getMainExecutor(), new android.content.DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(android.content.DialogInterface dialogue, int bouton) {
                            activite.appelerJs("tcBiometrieEchec", "");
                        }
                    })
                    .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG);

                builder.build().authenticate(
                    new BiometricPrompt.CryptoObject(cipher),
                    new CancellationSignal(),
                    activite.getMainExecutor(),
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult resultat) {
                            try {
                                Cipher c = resultat.getCryptoObject().getCipher();
                                byte[] chiffre = Base64.decode(jetonChiffreB64, Base64.NO_WRAP);
                                byte[] jetonBrut = c.doFinal(chiffre);
                                activite.appelerJs("tcBiometrieDeverrouille", new String(jetonBrut, "UTF-8"));
                            } catch (Exception e) {
                                activite.appelerJs("tcBiometrieEchec", "");
                            }
                        }

                        @Override
                        public void onAuthenticationError(int codeErreur, CharSequence messageErreur) {
                            activite.appelerJs("tcBiometrieEchec", "");
                        }

                        @Override
                        public void onAuthenticationFailed() {
                            // Empreinte non reconnue : le prompt système reste ouvert pour un nouvel essai.
                        }
                    }
                );
            } catch (Exception e) {
                activite.appelerJs("tcBiometrieEchec", "");
            }
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
