allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)

    // Some Flutter plugins (e.g. fluttertoast) pin an old compileSdk (33) in
    // their own build.gradle, but newer transitive androidx deps require API
    // 34+. Force every Android module to compile against SDK 36. Registered
    // here (before evaluationDependsOn below) so the hook lands before the
    // subproject is evaluated. Reflection avoids importing AGP types.
    afterEvaluate {
        val android = project.extensions.findByName("android")
        if (android != null) {
            try {
                android.javaClass
                    .getMethod("compileSdkVersion", Int::class.javaPrimitiveType)
                    .invoke(android, 36)
            } catch (_: Exception) {
                // module doesn't expose compileSdkVersion(int) — ignore
            }
        }
    }
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
