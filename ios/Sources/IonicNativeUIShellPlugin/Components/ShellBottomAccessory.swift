import UIKit

/// Mini-player content for `UITabAccessory` (iOS 26+). Ported from stay-liquid's
/// `TabsBarAccessoryContentView` so Native UI Shell can host the same slot.
@available(iOS 26.0, *)
final class ShellBottomAccessoryContentView: UIView {
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

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        titleLabel.font = .preferredFont(forTextStyle: .subheadline)
        titleLabel.textColor = .label
        subtitleLabel.font = .preferredFont(forTextStyle: .caption1)
        subtitleLabel.textColor = .secondaryLabel
        artworkView.contentMode = .scaleAspectFill
        artworkView.clipsToBounds = true
        artworkView.layer.cornerRadius = 6
        artworkView.backgroundColor = .secondarySystemFill
        artworkView.widthAnchor.constraint(equalToConstant: 32).isActive = true
        artworkView.heightAnchor.constraint(equalToConstant: 32).isActive = true
        playPauseButton.addTarget(self, action: #selector(playPauseTapped), for: .touchUpInside)
        playPauseButton.tintColor = .label
        updatePlayImage()
        textStack.axis = .vertical
        textStack.addArrangedSubview(titleLabel)
        textStack.addArrangedSubview(subtitleLabel)
        stack.axis = .horizontal
        stack.alignment = .center
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.addArrangedSubview(artworkView)
        stack.addArrangedSubview(textStack)
        stack.addArrangedSubview(playPauseButton)
        addSubview(stack)
        progressTrack.translatesAutoresizingMaskIntoConstraints = false
        progressTrack.backgroundColor = UIColor.label.withAlphaComponent(0.12)
        progressFill.backgroundColor = .label
        progressTrack.addSubview(progressFill)
        addSubview(progressTrack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            stack.topAnchor.constraint(equalTo: topAnchor, constant: 8),
            stack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -10),
            progressTrack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            progressTrack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            progressTrack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -4),
            progressTrack.heightAnchor.constraint(equalToConstant: 2),
        ])
        addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(bodyTapped)))
        progressTrack.isHidden = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func update(title: String?, subtitle: String?, isPlaying: Bool) {
        titleLabel.text = title
        subtitleLabel.text = subtitle
        self.isPlaying = isPlaying
        updatePlayImage()
    }

    func setProgress(_ value: CGFloat) {
        progress = value
        progressTrack.isHidden = value < 0
        setNeedsLayout()
    }

    func setArtwork(_ image: UIImage?) { artworkView.image = image }

    override func layoutSubviews() {
        super.layoutSubviews()
        let width = progressTrack.bounds.width * max(0, min(1, progress))
        progressFill.frame = CGRect(x: 0, y: 0, width: width, height: progressTrack.bounds.height)
    }

    private func updatePlayImage() {
        let name = isPlaying ? "pause.fill" : "play.fill"
        playPauseButton.setImage(UIImage(systemName: name), for: .normal)
    }

    @objc private func playPauseTapped() { onPlayPause?() }
    @objc private func bodyTapped() { onTap?() }
}

@available(iOS 26.0, *)
enum ShellBottomAccessory {
    static func apply(
        to controller: UITabBarController,
        content: ShellBottomAccessoryContentView,
        visible: Bool,
        animated: Bool
    ) {
        if visible {
            controller.setBottomAccessory(UITabAccessory(contentView: content), animated: animated)
        } else {
            controller.setBottomAccessory(nil, animated: animated)
        }
    }
}
