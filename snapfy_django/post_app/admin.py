from django.contrib import admin
from .models import ArchivedPost, Comment, CommentReply, Hashtag, Like, Post, SavedPost
# Register your models here.

admin.site.register(ArchivedPost)
admin.site.register(Comment)
admin.site.register(CommentReply)
admin.site.register(Hashtag)
admin.site.register(Like)
admin.site.register(Post)
admin.site.register(SavedPost)