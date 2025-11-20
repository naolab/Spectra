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
        case "list_displays":
            listDisplays()
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
          list_displays
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
            let layer = dict[kCGWindowLayer as String] as? Int ?? 0
            
            // Filter out small windows or windows without title (unless layer 0)
            // This matches the logic in App.tsx to avoid unnecessary captures
            let widthNum = bounds["Width"] as? NSNumber
            let heightNum = bounds["Height"] as? NSNumber
            let width = widthNum?.doubleValue ?? 0
            let height = heightNum?.doubleValue ?? 0
            let hasTitle = !name.trimmingCharacters(in: .whitespaces).isEmpty
            
            // Debug print (to stderr so it doesn't break JSON)
            // fputs("Window \(id): \(name) (\(width)x\(height))\n", stderr)
            
            if width <= 50 || height <= 50 || (!hasTitle && layer != 0) {
                return nil
            }
            
            // Generate thumbnail
            var thumbnail: String? = nil
            if let windowId = CGWindowID(exactly: id) {
                // Use nominalResolution instead of bestResolution for thumbnails to save CPU
                let imageOption: CGWindowImageOption = [.boundsIgnoreFraming, .nominalResolution]
                if let cgImage = CGWindowListCreateImage(.null, .optionIncludingWindow, windowId, imageOption) {
                    thumbnail = generateThumbnailBase64(from: cgImage)
                }
            }
            
            return [
                "id": id,
                "ownerName": ownerName,
                "name": name,
                "bounds": bounds,
                "layer": layer,
                "thumbnail": thumbnail ?? ""
            ]
        }
        
        // fputs("Found \(windows.count) windows after filtering\n", stderr)

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

    static func listDisplays() {
        var displayCount: UInt32 = 0
        var activeDisplays = [CGDirectDisplayID](repeating: 0, count: 10) // Max 10 displays
        
        let result = CGGetActiveDisplayList(UInt32(activeDisplays.count), &activeDisplays, &displayCount)
        
        guard result == .success else {
            print("[]")
            return
        }
        
        var displays: [[String: Any]] = []
        for i in 0..<Int(displayCount) {
            let displayId = activeDisplays[i]
            let width = CGDisplayPixelsWide(displayId)
            let height = CGDisplayPixelsHigh(displayId)
            let bounds = [
                "X": CGDisplayBounds(displayId).origin.x,
                "Y": CGDisplayBounds(displayId).origin.y,
                "Width": Double(width),
                "Height": Double(height)
            ]
            let isMain = CGDisplayIsMain(displayId) == 1
            
            // Generate thumbnail
            var thumbnail: String? = nil
            if let cgImage = CGDisplayCreateImage(displayId) {
                thumbnail = generateThumbnailBase64(from: cgImage)
            }
            
            displays.append([
                "id": displayId,
                "width": width,
                "height": height,
                "bounds": bounds,
                "isMain": isMain,
                "name": "Display \(i + 1)",
                "thumbnail": thumbnail ?? ""
            ])
        }
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: displays, options: .prettyPrinted)
            if let jsonString = String(data: jsonData, encoding: .utf8) {
                print(jsonString)
            }
        } catch {
            print("Error serializing JSON: \(error)")
            exit(1)
        }
    }
    
    static func generateThumbnailBase64(from cgImage: CGImage) -> String? {
        let maxDimension: CGFloat = 400 // Max width or height for thumbnail
        let width = CGFloat(cgImage.width)
        let height = CGFloat(cgImage.height)
        
        let scale = min(maxDimension / width, maxDimension / height)
        let newWidth = width * scale
        let newHeight = height * scale
        
        let newSize = NSSize(width: newWidth, height: newHeight)
        let image = NSImage(cgImage: cgImage, size: NSSize(width: width, height: height))
        
        guard let resizedImage = image.resized(to: newSize) else { return nil }
        
        guard let tiffData = resizedImage.tiffRepresentation,
              let bitmapRep = NSBitmapImageRep(data: tiffData),
              let jpegData = bitmapRep.representation(using: .jpeg, properties: [.compressionFactor: 0.6]) else {
            return nil
        }
        
        return jpegData.base64EncodedString()
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

extension NSImage {
    func resized(to newSize: NSSize) -> NSImage? {
        if let bitmapRep = NSBitmapImageRep(
            bitmapDataPlanes: nil, pixelsWide: Int(newSize.width), pixelsHigh: Int(newSize.height),
            bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
            colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
        ) {
            bitmapRep.size = newSize
            NSGraphicsContext.saveGraphicsState()
            NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmapRep)
            self.draw(in: NSRect(x: 0, y: 0, width: newSize.width, height: newSize.height), from: .zero, operation: .copy, fraction: 1.0)
            NSGraphicsContext.restoreGraphicsState()
            
            let resizedImage = NSImage(size: newSize)
            resizedImage.addRepresentation(bitmapRep)
            return resizedImage
        }
        return nil
    }
}
