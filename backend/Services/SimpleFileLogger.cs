using System;
using System.IO;
using System.Text;

namespace backend.Services
{
    public static class SimpleFileLogger
    {
        private static readonly object _lock = new object();

        public static void Log(string filePath, string message)
        {
            if (string.IsNullOrWhiteSpace(filePath))
                return;

            try
            {
                var dir = Path.GetDirectoryName(filePath);
                if (!string.IsNullOrWhiteSpace(dir) && !Directory.Exists(dir))
                    Directory.CreateDirectory(dir);

                var line = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}] {message}{Environment.NewLine}";
                lock (_lock)
                {
                    File.AppendAllText(filePath, line, Encoding.UTF8);
                }
            }
            catch
            {
                // ログ書き込み失敗は握りつぶす（業務処理を止めない）
            }
        }
    }
}

