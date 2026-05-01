# Règles ProGuard pour TimeCool
# L'application étant une WebView pure, aucune règle spéciale n'est nécessaire
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
