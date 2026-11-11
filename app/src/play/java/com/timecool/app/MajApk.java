package com.timecool.app;

/**
 * Variante « play » (Google Play) : aucune mise a jour integree.
 *
 * Mission 79 : Google Play fait lui-meme les mises a jour, et interdit qu'une
 * appli telecharge ou installe un APK. La page ne demande jamais de mise a
 * jour dans cette variante (TimeCoolNatif.canal() vaut « play ») ; si elle le
 * faisait quand meme, rien n'est telecharge et la page en est informee.
 */
final class MajApk {

    private MajApk() { }

    static void lancer(final MainActivity activite, final String url) {
        activite.appelerJs("tcMajEchec", "GooglePlay");
    }
}
