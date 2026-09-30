import UIKit

/// Mini-player content hosted in `UITabAccessory` (iOS 26+).
@available(iOS 26.0, *)
final class ShellTabAccessoryContentView: UIView {
    var onPlayPause: (() -> Void)?
    var onTap: (() -> Void)?

    private let artworkView = UIImageView()
    private let titleLabel = UILabel()
    private let subtitleLabel = UILabel()
    private let playPauseButton = UIButton(type: .system)
    private let stack = UIStackView()
    private let textStack = UIStackView()
    private let progressTrack = UIView()
    private let progressFill = UIView()
    private var isPlaying = false
    private var progress: CGFloat = -1
    private var progressColor: UIColor?
    private var targetWidth: CGFloat = 0
    var currentArtworkUrl: String?
    var hasArtwork: Bool { artworkView.image != nil }

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        titleLabel.font = .preferredFont(forTextStyle: .subheadline).withWeight(.semibold)
        titleLabel.textColor = .label
        titleLabel.numberOfLines = 1
        titleLabel.lineBreakMode = .byTruncatingTail
        titleLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        subtitleLabel.font = .preferredFont(forTextStyle: .caption1)
        subtitleLabel.textColor = .secondaryLabel
        subtitleLabel.numberOfLines = 1
        subtitleLabel.lineBreakMode = .byTruncatingTail
        subtitleLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        artworkView.contentMode = .scaleAspectFill
        artworkView.clipsToBounds = true
        artworkView.layer.cornerRadius = 6
        artworkView.layer.cornerCurve = .continuous
        artworkView.backgroundColor = .secondarySystemFill
        artworkView.widthAnchor.constraint(equalToConstant: 32).isActive = true
        artworkView.heightAnchor.constraint(equalToConstant: 32).isActive = true
        playPauseButton.addTarget(self, action: #selector(playPauseTapped), for: .touchUpInside)
        playPauseButton.tintColor = .label
        playPauseButton.accessibilityLabel = "Play or pause"
        playPauseButton.setContentHuggingPriority(.required, for: .horizontal)
        playPauseButton.setContentCompressionResistancePriority(.required, for: .horizontal)
        var config = UIButton.Configuration.plain()
        config.contentInsets = NSDirectionalEdgeInsets(top: 6, leading: 6, bottom: 6, trailing: 6)
        playPauseButton.configuration = config
        updatePlayImage()
        textStack.axis = .vertical
        textStack.spacing = 1
        textStack.alignment = .leading
        textStack.addArrangedSubview(titleLabel)
        textStack.addArrangedSubview(subtitleLabel)
        textStack.setContentHuggingPriority(.defaultLow, for: .horizontal)
        stack.axis = .horizontal
        stack.alignment = .center
        stack.distribution = .fill
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.addArrangedSubview(artworkView)
        stack.addArrangedSubview(textStack)
        stack.addArrangedSubview(playPauseButton)
        stack.setCustomSpacing(8, after: textStack)
        addSubview(stack)
        progressTrack.translatesAutoresizingMaskIntoConstraints = false
        progressTrack.isUserInteractionEnabled = false
        progressTrack.isHidden = true
        progressFill.isUserInteractionEnabled = false
        progressTrack.addSubview(progressFill)
        addSubview(progressTrack)
        applyProgressColors()
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -10),
            stack.topAnchor.constraint(equalTo: topAnchor, constant: 8),
            stack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -10),
            progressTrack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            progressTrack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            progressTrack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -4),
            progressTrack.heightAnchor.constraint(equalToConstant: 2),
        ])
        addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(bodyTapped)))
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func apply(_ node: ShellControl) {
        titleLabel.text = node.title ?? node.items.first?.content.label
        let subtitle = node.subtitle
        subtitleLabel.text = subtitle
        subtitleLabel.isHidden = subtitle?.isEmpty != false
        isPlaying = node.items.first?.content.selected == true
            || node.items.first?.content.label.lowercased().contains("pause") == true
        updatePlayImage()
        if let progress = node.progress {
            setProgress(CGFloat(progress))
        }
        if let color = node.progressColor {
            setProgressColor(UIColor.parseCSS(color))
        }
    }

    func setProgress(_ value: CGFloat) {
        progress = value
        progressTrack.isHidden = !value.isFinite || value < 0
        setNeedsLayout()
    }

    func setProgressColor(_ color: UIColor?) {
        progressColor = color
        applyProgressColors()
    }

    func setArtwork(_ image: UIImage?) {
        artworkView.image = image
        artworkView.backgroundColor = image == nil ? .secondarySystemFill : .clear
    }

    func setTargetWidth(_ width: CGFloat) {
        guard width > 0 else { return }
        targetWidth = width
        setNeedsLayout()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        if targetWidth > 0, let parent = superview {
            let midX = parent.bounds.midX
            if abs(bounds.width - targetWidth) > 1 || abs(center.x - midX) > 1 {
                bounds.size.width = targetWidth
                center = CGPoint(x: midX, y: center.y)
            }
        }
        let width = progressTrack.bounds.width * max(0, min(1, progress))
        progressFill.frame = CGRect(x: 0, y: 0, width: width, height: progressTrack.bounds.height)
        let size = min(artworkView.bounds.width, artworkView.bounds.height)
        if size > 0 {
            artworkView.layer.cornerRadius = size * 0.22
        }
    }

    private func applyProgressColors() {
        if let progressColor {
            progressFill.backgroundColor = progressColor
            progressTrack.backgroundColor = progressColor.withAlphaComponent(0.22)
        } else {
            progressFill.backgroundColor = UIColor.label.withAlphaComponent(0.9)
            progressTrack.backgroundColor = UIColor.label.withAlphaComponent(0.18)
        }
    }

    private func updatePlayImage() {
        let name = isPlaying ? "pause.fill" : "play.fill"
        let symbol = UIImage.SymbolConfiguration(pointSize: 16, weight: .semibold)
        playPauseButton.setImage(UIImage(systemName: name, withConfiguration: symbol), for: .normal)
    }

    @objc private func playPauseTapped() { onPlayPause?() }
    @objc private func bodyTapped() { onTap?() }
}

@available(iOS 26.0, *)
enum ShellTabAccessory {
    static let kind = ShellComponent.tabAccessory

    /// Full-width bottom strip with a reserved tab bar so `UITabAccessory` sits in the
    /// system gap above the overlay `UITabBar`, not inside the pill.
    final class Host {
        private var controller: UITabBarController?
        private var cover: Passthrough?
        private var content: ShellTabAccessoryContentView?
        private var artworkLoad: URLSessionDataTask?
        var playId: String?
        var tapId: String?

        func apply(
            node: ShellControl,
            tabBarBounds: CGRect,
            owner: UIViewController,
            parent: UIView,
            shellHost: UIView?,
            activate: @escaping (String) -> Void
        ) {
            let accessoryHeight: CGFloat = 56
            let gap: CGFloat = 8
            let lift = accessoryHeight + gap
            let hostFrame = CGRect(
                x: parent.bounds.minX,
                y: max(0, tabBarBounds.minY - lift),
                width: parent.bounds.width,
                height: tabBarBounds.maxY - max(0, tabBarBounds.minY - lift)
            )

            let cover = ensureCover(parent: parent, shellHost: shellHost)
            cover.frame = hostFrame
            cover.autoresizingMask = [.flexibleWidth, .flexibleTopMargin]
            cover.clipsToBounds = false

            let host = ensureController(owner: owner, parent: cover)
            host.view.frame = cover.bounds
            host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            host.view.clipsToBounds = false
            let view: ShellTabAccessoryContentView
            if let existing = content {
                view = existing
            } else {
                let created = ShellTabAccessoryContentView()
                created.onPlayPause = { [weak self] in
                    if let id = self?.playId { activate(id) }
                }
                created.onTap = { [weak self] in
                    if let id = self?.tapId { activate(id) }
                }
                content = created
                view = created
            }
            playId = node.items.first?.id
            tapId = node.id
            view.apply(node)
            view.setTargetWidth(tabBarBounds.width)
            loadArtwork(node.artworkUrl, into: view)
            host.setBottomAccessory(UITabAccessory(contentView: view), animated: false)
            cover.content = view
            cover.isHidden = false
            host.view.isHidden = false
        }

        func detach() {
            artworkLoad?.cancel()
            artworkLoad = nil
            if let controller {
                controller.setBottomAccessory(nil, animated: false)
                controller.willMove(toParent: nil)
                controller.view.removeFromSuperview()
                controller.removeFromParent()
            }
            cover?.removeFromSuperview()
            controller = nil
            cover = nil
            content = nil
            playId = nil
            tapId = nil
        }

        private func ensureCover(parent: UIView, shellHost: UIView?) -> Passthrough {
            if let existing = cover {
                if existing.superview !== parent {
                    insertCover(existing, parent: parent, shellHost: shellHost)
                } else if let shellHost, existing.superview === parent {
                    parent.insertSubview(existing, belowSubview: shellHost)
                }
                return existing
            }
            let created = Passthrough()
            created.backgroundColor = .clear
            created.isOpaque = false
            insertCover(created, parent: parent, shellHost: shellHost)
            cover = created
            return created
        }

        private func insertCover(_ cover: UIView, parent: UIView, shellHost: UIView?) {
            if let shellHost, shellHost.superview === parent {
                parent.insertSubview(cover, belowSubview: shellHost)
            } else {
                parent.addSubview(cover)
            }
        }

        private func ensureController(owner: UIViewController, parent: UIView) -> UITabBarController {
            if let existing = controller {
                if existing.view.superview !== parent {
                    parent.addSubview(existing.view)
                }
                return existing
            }
            let created = UITabBarController()
            created.view.backgroundColor = .clear
            created.view.isOpaque = false
            created.view.clipsToBounds = false
            let placeholder = UIViewController()
            placeholder.view.backgroundColor = .clear
            placeholder.tabBarItem = UITabBarItem(title: " ", image: UIImage(systemName: "circle"), tag: 0)
            created.setViewControllers([placeholder], animated: false)
            if #available(iOS 15.0, *) {
                let appearance = UITabBarAppearance()
                appearance.configureWithTransparentBackground()
                created.tabBar.standardAppearance = appearance
                created.tabBar.scrollEdgeAppearance = appearance
            }
            created.tabBar.alpha = 0
            created.tabBar.isUserInteractionEnabled = false
            created.additionalSafeAreaInsets.bottom = 0
            owner.addChild(created)
            parent.addSubview(created.view)
            created.didMove(toParent: owner)
            controller = created
            return created
        }

        final class Passthrough: UIView {
            weak var content: UIView?

            override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
                guard let content, !content.isHidden, content.alpha > 0.01 else { return nil }
                return content.hitTest(convert(point, to: content), with: event)
            }
        }

        private func loadArtwork(_ urlString: String?, into content: ShellTabAccessoryContentView) {
            guard let urlString, !urlString.isEmpty else {
                artworkLoad?.cancel()
                content.currentArtworkUrl = nil
                content.setArtwork(nil)
                return
            }
            if urlString == content.currentArtworkUrl, content.hasArtwork {
                return
            }
            content.currentArtworkUrl = urlString
            artworkLoad?.cancel()
            if urlString.hasPrefix("data:image"),
               let comma = urlString.firstIndex(of: ","),
               let data = Data(base64Encoded: String(urlString[urlString.index(after: comma)...])),
               let image = UIImage(data: data) {
                content.setArtwork(image)
                return
            }
            if urlString.hasPrefix("file://"), let url = URL(string: urlString) {
                content.setArtwork(UIImage(contentsOfFile: url.path))
                return
            }
            guard let url = URL(string: urlString) else { return }
            let task = URLSession.shared.dataTask(with: url) { [weak content] data, _, _ in
                let image = data.flatMap { UIImage(data: $0) }
                DispatchQueue.main.async {
                    guard content?.currentArtworkUrl == urlString else { return }
                    content?.setArtwork(image)
                }
            }
            artworkLoad = task
            task.resume()
        }
    }
}

private extension UIFont {
    func withWeight(_ weight: UIFont.Weight) -> UIFont {
        let descriptor = fontDescriptor.addingAttributes([
            .traits: [UIFontDescriptor.TraitKey.weight: weight]
        ])
        return UIFont(descriptor: descriptor, size: pointSize)
    }
}

extension UIColor {
    static func parseCSS(_ value: String?) -> UIColor? {
        guard let value, !value.isEmpty else { return nil }
        let numbers = value.components(separatedBy: CharacterSet(charactersIn: "0123456789.").inverted).compactMap(Double.init)
        if numbers.count >= 3 {
            return UIColor(
                red: numbers[0] / 255,
                green: numbers[1] / 255,
                blue: numbers[2] / 255,
                alpha: numbers.count > 3 ? numbers[3] : 1
            )
        }
        var hex = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard hex.hasPrefix("#"), hex.count == 7 else { return nil }
        hex.removeFirst()
        guard let int = UInt64(hex, radix: 16) else { return nil }
        return UIColor(
            red: CGFloat((int >> 16) & 0xff) / 255,
            green: CGFloat((int >> 8) & 0xff) / 255,
            blue: CGFloat(int & 0xff) / 255,
            alpha: 1
        )
    }
}
