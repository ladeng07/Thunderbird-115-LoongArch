# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

password-quality-meter = Độ an toàn mật khẩu

## Change Password dialog

change-device-password-window =
    .title = Thay đổi mật khẩu

# Variables:
# $tokenName (String) - Security device of the change password dialog
change-password-token = Thiết bị bảo mật: { $tokenName }
change-password-old = Mật khẩu hiện tại:
change-password-new = Mật khẩu mới:
change-password-reenter = Mật khẩu mới (nhập lại):

pippki-failed-pw-change = Không thể thay đổi mật khẩu.
pippki-incorrect-pw = Bạn đã không nhập đúng mật khẩu hiện tại. Vui lòng thử lại.
pippki-pw-change-ok = Đã thay đổi mật khẩu.

pippki-pw-empty-warning = Mật khẩu được lưu trữ và khóa riêng của bạn sẽ không được bảo vệ.
pippki-pw-erased-ok = Bạn đã xóa mật khẩu của bạn. { pippki-pw-empty-warning }
pippki-pw-not-wanted = Cảnh báo! Bạn đã quyết định không sử dụng mật khẩu. { pippki-pw-empty-warning }

pippki-pw-change2empty-in-fips-mode = Bạn hiện đang ở chế độ FIPS. FIPS yêu cầu không bỏ trống mật khẩu.

## Reset Primary Password dialog

reset-primary-password-window2 =
    .title = Đặt lại mật khẩu chính
    .style = min-width: 40em
reset-password-button-label =
    .label = Đặt lại
reset-primary-password-text = Nếu bạn đặt lại mật khẩu chính, toàn bộ các mật khẩu web, email, dữ liệu biểu mẫu, chứng chỉ và khóa cá nhân đã lưu sẽ bị xóa. Bạn có chắc muốn đặt lại mật khẩu chính của mình không?

pippki-reset-password-confirmation-title = Đặt lại mật khẩu chính
pippki-reset-password-confirmation-message = Đã đặt lại mật khẩu chính của bạn.

## Downloading cert dialog

download-cert-window2 =
    .title = Đang tải Chứng chỉ
    .style = min-width: 46em
download-cert-message = Bạn được hỏi có tin tưởng một CA (Bên thẩm định Chứng chỉ) mới hay không.
download-cert-trust-ssl =
    .label = Tin CA này để nhận diện các trang web.
download-cert-trust-email =
    .label = Tin CA này để nhận diện những người dùng email.
download-cert-message-desc = Trước khi tin vào CA này với bất kì mục đích nào, bạn nên kiểm định chứng chỉ, điều khoản và thủ tục của nó (nếu có).
download-cert-view-cert =
    .label = Xem
download-cert-view-text = Kiểm định chứng chỉ của CA

## Client Authorization Ask dialog

client-auth-window =
    .title = Yêu cầu Nhận diện Người dùng
client-auth-site-description = Trang này yêu cầu bạn tự nhận diện chính mình với một chứng chỉ:
client-auth-choose-cert = Chọn một chứng chỉ để thực hiện việc nhận diện này:
client-auth-cert-details = Thông tin chi tiết của chứng chỉ được chọn:

## Set password (p12) dialog

set-password-window =
    .title = Chọn một Mật khẩu Sao lưu Chứng chỉ
set-password-message = Mật khẩu sao lưu chứng chỉ mà bạn đặt ở đây bảo vệ tập tin sao lưu mà bạn sẽ tạo. Bạn phải đặt mật khẩu để tiến hành sao lưu.
set-password-backup-pw =
    .value = Mật khẩu sao lưu chứng chỉ:
set-password-repeat-backup-pw =
    .value = Mật khẩu sao lưu chứng chỉ (nhập lại):
set-password-reminder = Quan trọng: Nếu bạn quên mật khẩu sao lưu chứng chỉ, sau này bạn sẽ không thể phục hồi bản sao lưu này. Hãy lưu vào một nơi an toàn.

## Protected Auth dialog

## Protected authentication alert

# Variables:
# $tokenName (String) - The name of the token to authenticate to (for example, "OS Client Cert Token (Modern)")
protected-auth-alert = Vui lòng xác thực với token “{ $tokenName }”. Cách thực hiện tùy thuộc vào token (ví dụ: sử dụng đầu đọc dấu vân tay hoặc nhập mã bằng bàn phím).
