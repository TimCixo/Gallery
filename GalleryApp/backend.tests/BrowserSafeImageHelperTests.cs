using GalleryApp.Api.Services;
using SixLabors.ImageSharp;
using Xunit;

namespace GalleryApp.Api.Tests;

public class BrowserSafeImageHelperTests
{
    [Fact]
    public void GetSafeDimensions_LeavesSafeImageUnchanged()
    {
        var size = BrowserSafeImageHelper.GetSafeDimensions(1280, 12000);

        Assert.Equal(new Size(1280, 12000), size);
    }

    [Fact]
    public void GetSafeDimensions_ClampsVeryTallImage()
    {
        var size = BrowserSafeImageHelper.GetSafeDimensions(1280, 25062);

        Assert.Equal(new Size(837, 16383), size);
    }

    [Fact]
    public void RequiresResize_ReturnsTrueWhenAnyDimensionExceedsLimit()
    {
        Assert.True(BrowserSafeImageHelper.RequiresResize(1280, 25062));
        Assert.True(BrowserSafeImageHelper.RequiresResize(20000, 1000));
        Assert.False(BrowserSafeImageHelper.RequiresResize(1280, 12000));
    }

    [Fact]
    public void RequiresBrowserSafeViewTranscode_TranscodesWebpEvenWithinSafeDimensions()
    {
        Assert.True(BrowserSafeImageHelper.RequiresBrowserSafeViewTranscode(".webp", 1280, 12000));
        Assert.False(BrowserSafeImageHelper.RequiresBrowserSafeViewTranscode(".jpg", 1280, 12000));
    }
}
