import UIKit

/// Mini-player content hosted in `UITabAccessory` (iOS 26+).
@available(iOS 26.0, *)
final class ShellTabAccessoryContentView: UIView, UIGestureRecognizerDelegate {
    var onPlayPause: (() -> Void)?
    var onTap: (() -> Void)?

    private static let swipeUpThreshold: CGFloat = 36
    private static let swipeMaxHorizontalDrift: CGFloat = 48

    private let artworkView = UIImageView()
    private let titleLabel = UILabel()
    private let subtitleLabel = UILabel()
    private let playPauseButton = UIButton(type: .system)
    private let stack = UIStackView()
    private let textStack = UIStackView()
    private let progressTrack = UIView()
    private let progressFill = UIView()
    private var isPlaying = false
    private var isInlineLayout = false
    private var progress: CGFloat = -1
    private var progressColor: UIColor?
    private var artworkSize: NSLayoutConstraint?
    private var stackLeading: NSLayoutConstraint?
    private var stackTrailing: NSLayoutConstraint?
    private var stackTop: NSLayoutConstraint?
    private var stackBottom: NSLayoutConstraint?
    private var panGesture: UIPanGestureRecognizer?
    private var suppressNextTap = false
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
        let artworkHeight = artworkView.heightAnchor.constraint(equalToConstant: 32)
        artworkHeight.isActive = true
        artworkSize = artworkHeight
        artworkView.widthAnchor.constraint(equalTo: artworkView.heightAnchor).isActive = true
        playPauseButton.addTarget(self, action: #selector(playPauseTapped), for: .touchUpInside)
        playPauseButton.tintColor = .label
        playPauseButton.accessibilityLabel = "Play or pause"
        playPauseButton.setContentHuggingPriority(.required, for: .horizontal)
        playPauseButton.setContentCompressionResistancePriority(.required, for: .horizontal)
        playPauseButton.widthAnchor.constraint(greaterThanOrEqualToConstant: 44).isActive = true
        playPauseButton.heightAnchor.constraint(greaterThanOrEqualToConstant: 44).isActive = true
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
        let leading = stack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16)
        let trailing = stack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -10)
        let top = stack.topAnchor.constraint(equalTo: topAnchor, constant: 8)
        let bottom = stack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -10)
        stackLeading = leading
        stackTrailing = trailing
        stackTop = top
        stackBottom = bottom
        NSLayoutConstraint.activate([
            leading, trailing, top, bottom,
            progressTrack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            progressTrack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            progressTrack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -4),
            progressTrack.heightAnchor.constraint(equalToConstant: 2.5),
        ])
        let tap = UITapGestureRecognizer(target: self, action: #selector(bodyTapped))
        tap.delegate = self
        addGestureRecognizer(tap)
        let pan = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
        pan.delegate = self
        pan.cancelsTouchesInView = false
        addGestureRecognizer(pan)
        panGesture = pan
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func apply(_ node: ShellControl) {
        titleLabel.text = node.title ?? node.items.first?.content.label
        let subtitle = node.subtitle
        subtitleLabel.text = subtitle
        subtitleLabel.isHidden = isInlineLayout || subtitle?.isEmpty != false
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

    func reset() {
        titleLabel.text = nil
        subtitleLabel.text = nil
        subtitleLabel.isHidden = true
        isPlaying = false
        currentArtworkUrl = nil
        setArtwork(nil)
        setProgress(-1)
        updatePlayImage()
    }

    func setInlineLayout(_ inline: Bool) {
        guard inline != isInlineLayout else { return }
        isInlineLayout = inline
        subtitleLabel.isHidden = inline || subtitleLabel.text?.isEmpty != false
        titleLabel.font = inline
            ? .preferredFont(forTextStyle: .caption1)
            : .preferredFont(forTextStyle: .subheadline).withWeight(.semibold)
        artworkSize?.constant = inline ? 28 : 32
        stack.spacing = inline ? 8 : 10
        stackLeading?.constant = inline ? 14 : 16
        stackTrailing?.constant = inline ? -12 : -10
        stackTop?.constant = inline ? 6 : 8
        stackBottom?.constant = inline ? -6 : -10
        var config = UIButton.Configuration.plain()
        let pad: CGFloat = inline ? 4 : 6
        config.contentInsets = NSDirectionalEdgeInsets(top: pad, leading: pad, bottom: pad, trailing: pad)
        playPauseButton.configuration = config
        updatePlayImage()
        setNeedsLayout()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
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
        let symbol = UIImage.SymbolConfiguration(pointSize: isInlineLayout ? 14 : 16, weight: .semibold)
        playPauseButton.setImage(UIImage(systemName: name, withConfiguration: symbol), for: .normal)
    }

    @objc private func playPauseTapped() { onPlayPause?() }

    @objc private func bodyTapped() {
        if suppressNextTap {
            suppressNextTap = false
            return
        }
        onTap?()
    }

    @objc private func handlePan(_ gesture: UIPanGestureRecognizer) {
        let translation = gesture.translation(in: self)
        switch gesture.state {
        case .changed:
            if translation.y < -12 { suppressNextTap = true }
        case .ended, .cancelled:
            let velocity = gesture.velocity(in: self)
            let isUpwardSwipe = translation.y < -Self.swipeUpThreshold
                && abs(translation.x) < Self.swipeMaxHorizontalDrift
                && velocity.y < 0
            if isUpwardSwipe {
                suppressNextTap = true
                onTap?()
            }
        default:
            break
        }
    }

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
        let point = touch.location(in: playPauseButton)
        return !playPauseButton.bounds.contains(point)
    }
}

@available(iOS 26.0, *)
enum ShellTabAccessory {
    static let kind = ShellComponent.tabAccessory
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
