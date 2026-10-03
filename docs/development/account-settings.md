# 统一资料与账号设置

邮箱与观猹登录共用「个人中心 → 资料与账号」。

- 头像上传后在浏览器裁成 256px 方形 JPEG，服务端校验光栅图片格式及 256 KiB 上限，存入现有 `users.avatar_url` 字段；不使用 Vercel 临时文件系统。
- 昵称通过 `PATCH /api/user/profile` 保存。
- 登录邮箱通过 `/api/user/account/code` 获取用途为 `email` 的验证码，再调用 `/api/user/account/email`。已有密码时还需验证当前密码。
- 第三方账号首次设置密码须先绑定真实邮箱，再验证用途为 `password` 的邮件验证码。已有密码时验证当前密码后修改。
- 登录弹窗的「忘记密码」使用 `/api/auth/reset-password/code` 和 `/api/auth/reset-password`；不会复用注册验证码。
- 内部 `@watcha.user` 和 `@anon.local` 地址不会作为用户可用的登录邮箱展示。

## 绑定与合并

观猹用户填写旧账号邮箱、密码并确认合并后，`/api/user/account/merge` 在同一事务内完成：

1. 验证当前会话、旧账号密码与观猹绑定冲突，锁定两个用户行。
2. 迁移任务（子任务通过任务 ID 保留）、通知和兑换记录。相同兑换码去重，迁移记录保留原 ID。
3. 保留旧账号昵称、密码及既有头像；旧账号无头像时继承当前头像。
4. 保留等级最高的有效会员权益；同等级使用较晚到期日，不用低等级的时长延长高等级权益。累计当天配额使用量。
5. 迁移观猹身份，删除并入的账号，更新目标会话版本并签发新 Cookie。两种方式登录同一目标账号。

合并不可撤销，界面必须明确说明并由用户勾选确认。管理员配置账号不支持合并或在设置页修改登录凭据。

## 验证与会话

账号验证码保存在现有 `email_verifications` 表中；`email_lower` 使用邮箱、用途和当前用户 ID 的摘要键（找回场景使用邮箱作为主体），与注册验证码隔离。校验与账户修改共用事务，错误尝试次数持久化，成功仅消费一次。

`users.session_version` 默认 0，兼容原有 Cookie。修改邮箱、密码或合并后递增；认证只按用户 ID 与版本确认，不以邮箱把已删除账号的旧 Cookie 映射到别的账号。上线前执行 `0007_account_session_version.sql`。

运行 `bun test` 进行常规验证。数据库集成验证需设置 `RUN_ACCOUNT_INTEGRATION=1` 并运行 `bun --env-file=.env.local test src/lib/auth/account-integration.test.ts`。所有生成的测试数据都在事务内回滚；不发送邮件、不提交测试账号。
