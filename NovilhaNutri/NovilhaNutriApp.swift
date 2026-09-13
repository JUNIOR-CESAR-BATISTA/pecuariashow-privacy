import SwiftUI

@main
struct NovilhaNutriApp: App {
    @StateObject private var estado = AppEstado()
    @Environment(\.scenePhase) private var faseDaCena

    var body: some Scene {
        WindowGroup {
            RaizView()
                .environmentObject(estado)
                .tint(Paleta.verde)
        }
        .onChange(of: faseDaCena) { _, nova in
            if nova != .active {
                Task { @MainActor in estado.salvarAgora() }
            }
        }
    }
}
