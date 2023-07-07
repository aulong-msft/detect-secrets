tsc

if [ -f "./vss-extension-dev.json" ]
then
    tfx extension create --manifest-globs vss-extension-dev.json
else
    tfx extension create --manifest-globs vss-extension.json
fi