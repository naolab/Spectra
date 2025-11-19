import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

@main
struct SpectraCapture {
    static func main() {
        let args = CommandLine.arguments
        guard args.count > 1 else {
            printUsage()
            exit(1)
        }

        let command = args[1]

        switch command {
        case "list_windows":
            listWindows()
        case "capture_window":
            guard args.count > 2, let windowId = CGWindowID(args[2]) else {
                print("Error: Missing or invalid window ID")
                exit(1)
            }
            captureWindow(windowId: windowId)
        case "capture_display":
            let displayId: UInt32
            if args.count > 2, let id = UInt32(args[2]) {
                displayId = id
            } else {
                displayId = CGMainDisplayID()
            }
            captureDisplay(displayId: displayId)
        case "capture_region":
            guard args.count > 5,
                  let x = Double(args[2]),
                  let y = Double(args[3]),
                  let w = Double(args[4]),
                  let h = Double(args[5]) else {
                print("Error: Invalid region coordinates. Usage: capture_region <x> <y> <w> <h>")
                exit(1)
            }
            captureRegion(rect: CGRect(x: x, y: y, width: w, height: h))
        default:
            print("Unknown command: \(command)")
            printUsage()
            exit(1)
        }
    }

    static func printUsage() {
        print("""
        Usage: spectra-capture <command> [args...]
        Commands:
          list_windows
          capture_window <windowId>
          capture_display [displayId]
          capture_region <x> <y> <w> <h>
        """)
    }

    static func listWindows() {
        let options = CGWindowListOption(arrayLiteral: .optionOnScreenOnly, .excludeDesktopElements)
        guard let windowList = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
            print("[]")
            return
        }

        let windows = windowList.compactMap { dict -> [String: Any]? in
            guard let id = dict[kCGWindowNumber as String] as? Int,
                  let bounds = dict[kCGWindowBounds as String] as? [String: Any],
                  let ownerName = dict[kCGWindowOwnerName as String] as? String else {
                return nil
            }
            
            let name = dict[kCGWindowName as String] as? String ?? ""
            
            // Filter out some system windows if needed, but for now keep all
            
            return [
                "id": id,
                "ownerName": ownerName,
                "name": name,
                "bounds": bounds,
                "layer": dict[kCGWindowLayer as String] ?? 0
            ]
        }

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: windows, options: .prettyPrinted)
            if let jsonString = String(data: jsonData, encoding: .utf8) {
                print(jsonString)
            }
        } catch {
            print("Error serializing JSON: \(error)")
            exit(1)
        }
    }

    static func captureWindow(windowId: CGWindowID) {
        let imageOption: CGWindowImageOption = [.boundsIgnoreFraming, .bestResolution]
        guard let cgImage = CGWindowListCreateImage(.null, .optionIncludingWindow, windowId, imageOption) else {
            print("Error: Failed to capture window \(windowId)")
            exit(1)
        }
        outputImage(cgImage)
    }

    static func captureDisplay(displayId: CGDirectDisplayID) {
        guard let cgImage = CGDisplayCreateImage(displayId) else {
            print("Error: Failed to capture display \(displayId)")
            exit(1)
        }
        outputImage(cgImage)
    }

    static func captureRegion(rect: CGRect) {
        // Capture the screen content in the rect.
        // We can use CGWindowListCreateImage with .optionOnScreenBelowWindow and a null window ID to capture everything on screen?
        // Or just CGDisplayCreateImageForRect if available (deprecated?).
        // CGWindowListCreateImage with .optionOnScreenOnly captures everything.
        
        guard let cgImage = CGWindowListCreateImage(rect, .optionOnScreenOnly, kCGNullWindowID, .bestResolution) else {
            print("Error: Failed to capture region")
            exit(1)
        }
        outputImage(cgImage)
    }

    static func outputImage(_ image: CGImage) {
        let bitmapRep = NSBitmapImageRep(cgImage: image)
        // Convert to WebP if possible, or JPEG.
        // Swift standard lib doesn't have easy WebP without external deps.
        // We'll use JPEG for v1 as it's built-in.
        // Actually, let's output Base64 JPEG.
        
        guard let data = bitmapRep.representation(using: .jpeg, properties: [.compressionFactor: 0.8]) else {
            print("Error: Failed to convert image to JPEG")
            exit(1)
        }
        
        let base64 = data.base64EncodedString()
        // Print a JSON object with the data
        print("{\"type\": \"image\", \"format\": \"jpeg\", \"data\": \"\(base64)\"}")
    }
}

// Helper for NSBitmapImageRep
import AppKit
