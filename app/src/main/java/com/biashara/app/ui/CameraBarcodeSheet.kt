package com.biashara.app.ui

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

@Composable
fun CameraBarcodeSheet(onClose: () -> Unit, onBarcode: (String) -> Unit) {
    val context = LocalContext.current
    var allowed by remember { mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) }
    var error by remember { mutableStateOf("") }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted -> allowed = granted; if (!granted) error = "Camera access is off. You can still enter a barcode or SKU manually." }
    ActionSheet(onDismissRequest = onClose, title = { AppText("Scan product barcode", style = MaterialTheme.typography.headlineSmall) }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            AppText("Point the camera at an EAN barcode, QR code or product label. Only codes matching your business catalogue are used.", color = Muted)
            if (allowed) CameraBarcodePreview(Modifier.fillMaxWidth().height(300.dp), { code -> onBarcode(code); onClose() }, { error = it })
            else PrimaryButton("Allow camera", { permission.launch(Manifest.permission.CAMERA) }, tone = Green)
            if (error.isNotBlank()) AppText(error, color = Coral)
        }
    }, dismissButton = { TextButton(onClick = onClose) { AppText("Enter code instead", color = Green) } })
}

@androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
@Composable
private fun CameraBarcodePreview(modifier: Modifier, onBarcode: (String) -> Unit, onError: (String) -> Unit) {
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current
    val previewView = remember { PreviewView(context) }
    val latestCode by rememberUpdatedState(onBarcode)
    val latestError by rememberUpdatedState(onError)
    AndroidView(factory = { previewView }, modifier = modifier)
    DisposableEffect(previewView, lifecycle) {
        val scanner = BarcodeScanning.getClient()
        val worker = Executors.newSingleThreadExecutor()
        val busy = AtomicBoolean(false)
        val found = AtomicBoolean(false)
        val future = ProcessCameraProvider.getInstance(context)
        var disposed = false
        var provider: ProcessCameraProvider? = null
        var preview: Preview? = null
        var analysis: ImageAnalysis? = null
        future.addListener({
            if (!disposed) try {
                provider = future.get()
                preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
                analysis = ImageAnalysis.Builder().setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build().also { useCase ->
                    useCase.setAnalyzer(worker) { frame ->
                        val image = frame.image
                        if (image == null || found.get() || !busy.compareAndSet(false, true)) frame.close()
                        else scanner.process(InputImage.fromMediaImage(image, frame.imageInfo.rotationDegrees))
                            .addOnSuccessListener { codes ->
                                val code = codes.firstNotNullOfOrNull { it.rawValue?.takeIf(String::isNotBlank) }
                                if (!disposed && code != null && found.compareAndSet(false, true)) latestCode(code)
                            }
                            .addOnFailureListener { if (!disposed) latestError("Could not read this code. Try better lighting or enter it manually.") }
                            .addOnCompleteListener { busy.set(false); frame.close() }
                    }
                }
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
                    provider!!.bindToLifecycle(lifecycle, CameraSelector.DEFAULT_BACK_CAMERA, preview!!, analysis!!)
                else latestError("Camera access is off. Enter the code manually or grant camera access in settings.")
            } catch (_: Exception) { latestError("Camera unavailable. Enter the barcode or SKU manually.") }
        }, ContextCompat.getMainExecutor(context))
        onDispose {
            disposed = true
            analysis?.clearAnalyzer()
            listOfNotNull(preview, analysis).forEach { provider?.unbind(it) }
            scanner.close(); worker.shutdown()
        }
    }
}
