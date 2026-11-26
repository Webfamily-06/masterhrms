using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;

[assembly: AssemblyTitle("Master HRMS Biometric Device Manager")]
[assembly: AssemblyDescription("Cross-Platform Zero-DLL Biometric Device Manager & ADMS Sync")]
[assembly: AssemblyCompany("Master HRMS")]
[assembly: AssemblyProduct("Master HRMS Biometric Device Manager")]
[assembly: AssemblyCopyright("Copyright © Master HRMS")]
[assembly: AssemblyVersion("2.0.0.0")]
[assembly: AssemblyFileVersion("2.0.0.0")]

class MasterHrmsLauncher
{
    static void Main()
    {
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        var psi = new ProcessStartInfo
        {
            FileName = "node",
            Arguments = "server.js",
            WorkingDirectory = dir,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        try
        {
            Process.Start(psi);
        }
        catch (Exception ex)
        {
            System.Windows.Forms.MessageBox.Show(
                "Node.js is required to run Master HRMS Device Manager.\nInstall Node.js from https://nodejs.org\n\nDetails: " + ex.Message,
                "Master HRMS Device Manager",
                System.Windows.Forms.MessageBoxButtons.OK,
                System.Windows.Forms.MessageBoxIcon.Error);
        }
    }
}
