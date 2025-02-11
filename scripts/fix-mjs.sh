shopt -s globstar
for file in ./dist/esm/**/*.js; do
  # echo "Updating $file contents..."
  # sed -i '' "s/\.js'/\.mjs'/g" "$file"
  echo "Renaming $file to ${file%.js}.mjs..."
  mv "$file" "${file%.js}.mjs"
done
for file in ./dist/esm/**/*.js.map; do
  echo "Renaming $file to ${file%.js.map}.mjs.map..."
  mv "$file" "${file%.js.map}.mjs.map"
done
