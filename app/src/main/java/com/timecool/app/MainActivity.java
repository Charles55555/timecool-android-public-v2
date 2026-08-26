package com.timecool.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.provider.ContactsContract;

import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;

import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import java.util.concurrent.Executors;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends Activity {

    private WebView webView;

    /** Callback du sélecteur de fichiers, le temps que l'utilisateur choisisse. */
    private ValueCallback<Uri[]> fileCallback;

    private static final int REQ_FICHIER = 1001;
    private static final int REQ_CONTACTS = 1002;

    /*
     * Identifiant client Google servant d'audience au jeton d'identité.
     *
     * Credential Manager attend ici l'identifiant de type « Application
     * Web », PAS celui de type « Android ». Ce dernier doit exister dans
     * le même projet Google Cloud — il autorise l'application par la
     * signature de son APK — mais ce n'est pas sa valeur qu'on place ici.
     *
     * Doit rester identique à google_client_ids dans config.php côté
     * serveur, qui verifie l'audience du jeton.
     */
    private static final String GOOGLE_CLIENT_ID =
        "696652298607-v3muscv74tto7uokr5d1dalbjv62o0nr.apps.googleusercontent.com";

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
        super.onRequestPermissionsResult(requete, permissions, resultats);
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
        GetGoogleIdOption option = new GetGoogleIdOption.Builder()
            // false : on propose aussi les comptes jamais utilisés avec
            // TimeCool, sinon une première connexion n'aurait rien à offrir.
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(GOOGLE_CLIENT_ID)
            .setAutoSelectEnabled(false)
            .build();

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
                            appelerJs("tcGoogleJeton", g.getIdToken());
                        } else {
                            appelerJs("tcGoogleErreur", "type_inattendu");
                        }
                    } catch (Exception e) {
                        appelerJs("tcGoogleErreur", e.getClass().getSimpleName());
                    }
                }

                @Override
                public void onError(GetCredentialException e) {
                    // Couvre aussi l'annulation par l'utilisateur, que la
                    // page doit traiter sans afficher d'echec alarmant.
                    appelerJs("tcGoogleErreur", e.getClass().getSimpleName());
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
