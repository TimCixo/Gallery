using GalleryApp.Api.Services.MediaProcessing;
using Xunit;

namespace GalleryApp.Api.Tests;

public sealed class FfmpegArgumentsTests
{
    [Fact]
    public void BuildVideoPreview_AddsUpdateFlagForSingleImageOutput()
    {
        var arguments = FfmpegArguments.BuildVideoPreview(@"C:\media\source.mp4", @"C:\temp\preview.jpg");

        Assert.Contains("-frames:v 1", arguments);
        Assert.Contains("-update 1", arguments);
        Assert.Contains(@"""C:\temp\preview.jpg""", arguments);
    }
}
